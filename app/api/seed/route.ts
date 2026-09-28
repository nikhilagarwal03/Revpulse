import { NextResponse } from "next/server";
import { retainInteraction } from "@/lib/hindsight";

const seedOutcomes = [
  ["VP of Engineering", "Latency Reduction", "Meeting Booked"], ["VP of Engineering", "Cost Savings", "Objection - Do not care about cost"], ["CTO", "Release Coordination", "Meeting Booked"], ["CTO", "Hiring Support", "Objection - Building internally"], ["Head of Product", "Faster Experiments", "Meeting Booked"], ["Director of Engineering", "Incident Reduction", "Meeting Booked"], ["VP of Engineering", "Developer Experience", "Objection - Not a priority"], ["CTO", "Observability", "Meeting Booked"], ["Head of Platform", "Cloud Spend", "Objection - Budget frozen"], ["VP Product", "Shorter Feedback Loops", "Meeting Booked"],
];

export async function POST() {
  const results = await Promise.all(seedOutcomes.map(([title, hook, outcome]) => retainInteraction({ name: "Synthetic prospect", title, company: "Demo company" }, `Hook: ${hook}. Outcome: ${outcome}`)));
  return NextResponse.json({ seeded: Boolean(process.env.HINDSIGHT_API_KEY), count: results.length });
}