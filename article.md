# How I Used Hindsight to Make Feedback Persist

The first version of RevPulse could write a plausible cold email. That was the easy part. The hard part was making a meeting booked today change what the system writes tomorrow, without turning the application into a pile of prompt strings and request-specific state.

I built the system around one rule: an outreach outcome is not a UI event. It is a memory write. Once I treated feedback that way, Hindsight became the boundary between the email generator and the evolving sales playbook.

## The system is a loop, not a chatbot

RevPulse accepts a prospect name, role, and company. Before generating an email, it asks Hindsight what has worked for that role and what has failed. It passes those signals to Groq along with the prospect context. After the email is sent, the user records an outcome such as “Meeting Booked” or “Objection / Spam.” RevPulse stores the draft and the outcome back in Hindsight. A separate reflection operation can then summarize the accumulated evidence into a current playbook signal.

The flow is deliberately small:

```text
prospect profile
      |
      v
Hindsight recall -> Groq draft -> human sends email
                                      |
                                      v
                              outcome feedback
                                      |
                                      v
                             Hindsight retain
                                      |
                                      v
                             Hindsight reflect
```

This is different from attaching a conversation history to every model request. Conversation history tells the model what was said. Memory should tell it what was learned.

The application has three server routes around that loop:

- `POST /api/draft` recalls role-specific context and generates an email.
- `POST /api/feedback` stores the drafted email and its outcome.
- `GET /api/strategy` asks for a higher-level reflection over recent campaign behavior.

The browser also has a visible Memory Stream. It shows `RECALL`, `RETAIN`, and `REFLECT` events as they happen, but that stream is not the memory itself. It is an operational view of the memory lifecycle.

For the underlying model, I used [Hindsight agent memory](https://vectorize.io/what-is-agent-memory) rather than trying to make the LLM infer long-term behavior from a growing transcript. Hindsight is responsible for remembering and retrieving experience; Groq is responsible for turning the retrieved experience into language.

## The decision that mattered: make the memory API narrow

I put the provider-specific code in one module, `lib/hindsight.ts`, and exposed only three operations: `retainInteraction`, `recallContext`, and `reflectStrategy`.

That sounds like ordinary encapsulation, but it solved a practical problem. Without a narrow memory interface, route handlers start to know too much about storage payloads, metadata conventions, and provider response shapes. Then every new feature becomes another place where memory semantics can drift.

Here is the core wrapper:

```ts
export async function retainInteraction(
  prospectContext: ProspectContext,
  outcome: string,
) {
  return hindsightRequest("/v1/retain", {
    content: `Prospect: ${prospectContext.name}, ` +
      `${prospectContext.title} at ${prospectContext.company}. ` +
      `Outcome: ${outcome}`,
    metadata: {
      source: "revpulse",
      title: prospectContext.title,
      outcome,
    },
  });
}

export async function recallContext(prospectPersona: string) {
  const result = await hindsightRequest("/v1/recall", {
    query: `What messaging works for a ${prospectPersona}? ` +
      "Include successful hooks and objections.",
    budget: "mid",
  });

  return result?.results || result?.memories || [];
}
```

The wrapper uses Hindsight’s REST API directly. That keeps the integration easy to inspect and keeps credentials on the server. The provider URL, authorization header, and request failure behavior live in one place. If I later change the memory provider or add retries, route behavior does not need to change.

The payload also records the prospect role as metadata. That matters because “what works” is not a universal property of an email. An angle that resonates with a VP of Engineering may be irrelevant to a CTO or actively wrong for a head of Platform. Retrieval should be role-aware from the beginning.

The [Hindsight documentation](https://hindsight.vectorize.io/) describes the broader memory model, but the implementation lesson for me was simpler: store enough context to make a memory useful later, and do not make every caller reconstruct that context independently.

## Recall happens before the model sees the prospect

The draft route makes the order explicit. It recalls first, then sends both the prospect and recalled context to Groq.

```ts
const context = useMemory
  ? await recallContext(prospect.title).catch(() => [])
  : [];

const completion = await groq.chat.completions.create({
  model: "openai/gpt-oss-120b",
  temperature: 0.7,
  messages: [
    {
      role: "system",
      content:
        "You write concise, specific cold emails. " +
        "Avoid hype, generic praise, and invented facts. " +
        "Use the recalled signals when available.",
    },
    {
      role: "user",
      content: JSON.stringify({
        prospect,
        recalledContext: context,
      }),
    },
  ],
});
```

That ordering is more important than the exact wording of the system prompt. I wanted the model to receive evidence before it made a choice about the message angle. Otherwise, the application would generate a draft and then use memory only as an after-the-fact explanation.

The UI includes a memory toggle because I wanted a direct comparison between a generic draft and a memory-informed draft. It is also useful during development. When the toggle is off, the request sends no recalled context. When it is on, the Memory Stream reports the recall and the route includes the returned signals in the model input.

This gives me a concrete debugging question: did memory change the input to the model, or did the UI merely claim that it did? The route makes the answer inspectable.

## Feedback is a write, not a notification

The feedback route accepts the prospect, the full draft, and the outcome. It retains them together:

```ts
export async function POST(request: Request) {
  const { prospect, draft, outcome } = await request.json();

  await retainInteraction(
    prospect,
    `${outcome}\nDraft: ${draft}`,
  );

  return NextResponse.json({
    ok: true,
    persisted: Boolean(process.env.HINDSIGHT_API_KEY),
  });
}
```

The important detail is that I do not store only “meeting booked.” I store the message that produced the outcome too. A result without its preceding action is a weak learning signal. Later, the system needs to distinguish between a successful hook, a successful audience, and a successful combination of both.

I also store negative outcomes. This is where many feedback systems become misleading: they record wins because wins are pleasant and discard objections because objections feel like noise. For outbound messaging, an objection is often the most useful boundary condition available. “They did not care about cost” is more actionable than another vague success label.

In the production implementation, I would make the outcome vocabulary more structured than the initial UI strings. The current route already establishes the right direction by retaining the outcome and draft in one memory entry. A typed outcome taxonomy can be added without changing the recall or reflection contract.

## Reflection is separate from retrieval on purpose

Retrieval answers a local question: what should I remember for this role right now? Reflection answers a broader question: what pattern is emerging across the campaign?

RevPulse exposes that distinction directly:

```ts
export async function reflectStrategy() {
  const result = await hindsightRequest("/v1/reflect", {
    query:
      "Reflect on outbound campaign outcomes from the last 30 days " +
      "and summarize the current sales playbook.",
  });

  return result?.text || result?.summary || null;
}
```

That separation prevents every draft request from trying to rebuild the entire playbook. The draft path stays focused and fast: retrieve relevant signals, write one message. The strategy path can be slower and more comprehensive because it is an analysis operation, not an interactive completion.

The reflected result is shown as a current playbook signal, such as a preference for concrete release-coordination improvements over generic cost savings. That signal is not treated as immutable configuration. It is a summary derived from retained experience and can change as new outcomes arrive.

This is the part of Hindsight I found most useful conceptually. A memory layer is not only a vector search endpoint. It gives the application a place to distinguish raw experience from a synthesized operating rule. Those are different artifacts and should have different lifecycles.

## What the system learns from a simple interaction

Consider a sequence of four messages sent to engineering leaders.

The first uses cost savings as the lead and receives an objection: the prospect does not care about reducing cost. That outcome is retained with the draft. The second leads with latency reduction and produces a meeting. The third focuses on hiring support and receives an objection that the company is building internally. The fourth discusses release coordination and produces another meeting.

On a later request for a VP of Engineering, Hindsight can return those contrasting signals: avoid leading with cost, avoid assuming external hiring support is valued, and investigate latency or release coordination. The model still writes the email, but it is no longer choosing from a blank prompt.

The seed route makes this behavior reproducible by retaining a set of synthetic outcomes in one operation. In production, that same route would be replaced by imported campaign history or real events from the outbound system. The architectural point remains the same: the agent starts with experience, and every later interaction adds to it.

The Memory Stream makes the lifecycle visible without pretending that visibility is persistence. When I click Generate, I see a recall event. When I record an outcome, I see a retain event. When I ask for a strategy, I see a reflect event. That has been useful for diagnosing integration mistakes because a missing event often points directly to the broken boundary.

## Lessons I would carry to the next system

### 1. Store actions with outcomes

A label like “meeting booked” is not enough. Retain the draft, the prospect context, the role, the hook, and the result together. Future retrieval needs the relationship between what was tried and what happened.

### 2. Keep recall close to the decision it informs

I recall immediately before drafting because that is where the system chooses an angle. Retrieving memory in a background job or after generation would make it harder to prove that memory influenced the decision.

### 3. Treat objections as first-class memory

Negative feedback narrows the search space. It tells the next draft what not to repeat, which can be more valuable than another generic success.

### 4. Separate retrieval from reflection

Role-specific recall and campaign-level strategy are not the same query. Keeping them separate makes latency, testing, and debugging easier, and it prevents a broad summary from polluting a focused draft request.

### 5. Keep provider calls server-side

The browser should express intent and display state. It should not own Hindsight or Groq credentials, construct provider payloads, or decide how memory is persisted. The API routes make the memory contract testable and leave room for retries, validation, and audit logging.

The result is not a system that magically writes perfect emails. It is more useful than that. It is a system where the cost of an interaction is not lost when the request ends. Hindsight gives RevPulse a durable place to keep the evidence, recall it at the next decision point, and periodically turn accumulated outcomes into a clearer operating rule.

That is the difference between generating another email and building a system that can learn from sending one.
