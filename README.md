# RevPulse

RevPulse is a self-learning outbound prospecting agent. It recalls winning messaging before drafting an email, retains campaign outcomes, and reflects on the accumulated signal to improve the sales playbook.

## What is included

- **Action Arena**: prospect profile, memory toggle, AI draft generation, and outcome feedback.
- **Memory Stream**: live visual feedback for recall, retain, and reflect operations.
- **Hindsight integration**: persistent memory through the Hindsight Cloud REST API.
- **Groq integration**: server-side cold email generation with `openai/gpt-oss-120b`.
- **Demo seeding**: ten synthetic outcomes for a convincing first-run demo.
- **Demo fallback**: the interface remains usable without API keys, while clearly labeling local demo behavior.

## Stack

Next.js 16 App Router, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React, Groq SDK, and Hindsight Cloud.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Add the following values to `.env.local` for live provider calls:

```env
GROQ_API_KEY=your_groq_key
HINDSIGHT_API_KEY=your_hindsight_key
```

Never commit `.env.local`. The repository ignores all `.env*` files; `.env.example` is the safe template intended for GitHub.

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/draft` | POST | Recalls role-specific context and generates a draft with Groq. |
| `/api/feedback` | POST | Retains the draft and its outcome in Hindsight. |
| `/api/strategy` | GET | Reflects on campaign memory and returns the current playbook signal. |
| `/api/seed` | POST | Writes ten synthetic outcomes for demo data. |

All provider calls stay in server routes. The browser only receives the resulting draft, context metadata, and status information.

## Validation

```bash
npm run lint
npm run build
```

## Deploy

This app is ready for Vercel or another Next.js host. Configure `GROQ_API_KEY` and `HINDSIGHT_API_KEY` as server-side environment variables in the deployment provider before using live generation or persistence.