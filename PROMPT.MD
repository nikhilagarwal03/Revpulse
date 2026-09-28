# Project Overview: "RevPulse" - Self-Learning Outbound Prospecting Agent

## Role & Goal
You are an expert full-stack developer building a hackathon-winning AI agent. The goal is to build "RevPulse," an outbound sales agent that writes cold emails and actively learns from campaign feedback using Hindsight's memory layer. Do not build a stateless chatbot; persistent memory must be the core feature.

## Tech Stack
- **Framework**: Next.js (App Router, TypeScript).
- **Styling**: Tailwind CSS, Framer Motion (for smooth transitions), and Lucide React (for icons).
- **LLM Provider**: Groq API (target models: `qwen/qwen3-32b` or `openai/gpt-oss-120b`).
- **Memory Layer**: Hindsight Cloud via `@vectorize-io/hindsight-client` (or standard REST fetch to `https://api.hindsight.vectorize.io`).

## UI/UX Design System
- **Aesthetic**: Premium, dark-mode preferred glassmorphic design. 
- **Details**: Use frosted glass blurs (`backdrop-blur-md`, `bg-white/10` or `bg-black/40`), subtle iridescent border glows for active states, and a modern typography hierarchy.
- **Layout Requirements**:
  - **Left Panel (Action Arena)**: Form to input a Prospect (Name, Title, Company), a "Generate Draft" button, and a Rich Text area displaying the generated email. Below the email, include feedback buttons: "Mark as Meeting Booked" (Success) and "Mark as Objection/Spam" (Failure).
  - **Right Panel (Memory Stream)**: A visually distinct sidebar that acts as a live terminal/feed. It must display Hindsight operations in real-time (`[RECALL] Fetching past hooks...`, `[RETAIN] Logging objection...`, `[REFLECT] Synthesizing 30-day strategy...`) so judges can see the memory working under the hood.

---

## Step-by-Step Implementation Guide

### Step 1: Initialization & Configuration
1. Initialize the Next.js App Router project with Tailwind CSS.
2. Install dependencies: `npm install groq-sdk @vectorize-io/hindsight-client framer-motion lucide-react`.
3. Create `.env.local` scaffolding (leave values blank for the user to fill):
   - `GROQ_API_KEY=`
   - `HINDSIGHT_API_KEY=`
4. Create a unified `lib/hindsight.ts` utility file. This must export three core functions:
   - `retainInteraction(prospectContext, outcome)`: Pushes a completed interaction to Hindsight.
   - `recallContext(prospectPersona)`: Fetches past successful angles/objections for a specific role.
   - `reflectStrategy()`: Triggers a high-level reflection to update the overall sales playbook.

### Step 2: Core API Routes
Build the following endpoints in `app/api/`:
1. **`POST /api/draft`**: 
   - Accepts prospect details.
   - Awaits `recallContext()` from Hindsight.
   - Sends the recalled context + prospect details to Groq in the system prompt.
   - Returns the generated email draft and the recalled context (to display in the Memory Stream).
2. **`POST /api/feedback`**:
   - Accepts the drafted email, prospect details, and the outcome (Success/Objection).
   - Awaits `retainInteraction()` to log this event into Hindsight.
   - Returns a success status.
3. **`GET /api/strategy`**:
   - Calls `reflectStrategy()` and returns a summarized markdown string of what the agent has learned so far (e.g., "CTOs respond well to X, avoid Y").

### Step 3: Frontend Assembly
1. Build the Main Dashboard (`app/page.tsx`) splitting the screen into the Left Panel and Right Panel as defined in the Design System.
2. Build the `ProspectForm` component. Include a "Toggle Hindsight Context" switch so the user can demonstrate the "Before (Generic)" vs. "After (With Memory)" states for the hackathon judges.
3. Build the `MemoryStream` component. Use React state or a React context to push log messages here whenever an API call fires, animating them in smoothly with Framer Motion.

### Step 4: Synthetic Data Seeding (Crucial for Demo)
Create a `lib/seedData.ts` script or a hidden "Seed Data" button in the UI. When clicked, this should fire 10-15 synthetic `retain` calls to Hindsight with mock data. 
- Example payload 1: { title: "VP of Engineering", emailHook: "Cost Savings", outcome: "Objection - Do not care about cost." }
- Example payload 2: { title: "VP of Engineering", emailHook: "Latency Reduction", outcome: "Meeting Booked." }
*This ensures the agent is "smart" on day one of the demo.*

## Execution Directives
Start immediately by scaffolding the Next.js project, setting up the `lib/hindsight.ts` wrapper, and creating the frontend layout with the glassmorphic styling. Pause only if you need the developer to provide API keys to test the connection.