import { blockers, repairs } from "./insight";
import type { Agent, Finding, GlueStatus, Seat, SheafGraph, SwarmEvent } from "./types";
import type { PulseRng } from "./pulse-core";

/** Draft status change — never auto-applied to the contract (Phase 3). */
export type PatchProposal = {
  id: string;
  edgeId: string;
  proposedStatus: GlueStatus;
  rationale: string;
  seat: Seat;
  draft: true;
};

/** Canonical adversarial seats from contracts/EVAL.md */
export const EVAL_SEED: Finding[] = [
  {
    id: "ev-user",
    seat: "user",
    sev: "P0",
    claim: "I cannot tell what to do",
    evidence: "Header is ok ρ / hurt ρ / JEV n/128. No sentence names a folder.",
  },
  {
    id: "ev-operator",
    seat: "operator",
    sev: "P0",
    claim: "I cannot act on a map",
    evidence: "Inspector leads with kind and dim. Blockers are unsorted.",
  },
  {
    id: "ev-craft",
    seat: "craft",
    sev: "P1",
    claim: "Legal glue shouts as loud as a break",
    evidence: "Every curve is ~the same weight.",
  },
  {
    id: "ev-red",
    seat: "red",
    sev: "P0",
    claim: "The views are a costume of the paper",
    evidence: "Renaming the chip does not change the question.",
  },
];

function pushEvent(
  events: SwarmEvent[],
  rng: PulseRng,
  kind: SwarmEvent["kind"],
  text: string,
  status?: GlueStatus,
): SwarmEvent[] {
  const next: SwarmEvent = { id: rng.eventId(), at: rng.now(), kind, text, status };
  return [next, ...events].slice(0, 48);
}

/**
 * Eval tick: reviewer agents stamp seat findings; top repair becomes a draft patch only.
 */
export function applyEvalHarness(
  tick: number,
  graph: SheafGraph,
  agents: Agent[],
  jevDone: number,
  sessionFindings: Finding[],
  patchProposals: PatchProposal[],
  events: SwarmEvent[],
  rng: PulseRng,
): { sessionFindings: Finding[]; patchProposals: PatchProposal[]; events: SwarmEvent[] } {
  const reviewers = agents.filter((a) => a.role === "reviewer");
  let findings = [...sessionFindings];
  let patches = [...patchProposals];
  let ev = events;

  const seatOrder: Seat[] = ["user", "operator", "craft", "red"];
  reviewers.forEach((rev, i) => {
    const seat = seatOrder[i % seatOrder.length];
    const seed = EVAL_SEED.find((f) => f.seat === seat) ?? EVAL_SEED[0];
    const draftId = `draft-${tick}-${rev.id}`;
    if (findings.some((f) => f.id === draftId)) return;
    const blocked = blockers(graph).length;
    const finding: Finding = {
      ...seed,
      id: draftId,
      evidence: `${seed.evidence} (tick ${tick}, blockers ${blocked}, ${rev.id})`,
    };
    findings = [finding, ...findings].slice(0, 32);
    ev = pushEvent(ev, rng, "finding", `${seat} · ${finding.claim}`, "strange");
  });

  const top = repairs(graph)[0];
  if (top && !patches.some((p) => p.edgeId === top.id)) {
    const proposal: PatchProposal = {
      id: `patch-${tick}-${top.id}`,
      edgeId: top.id,
      proposedStatus: "ok",
      rationale: `Counterfactual: flip ${top.from}→${top.to} to open ${top.opens.join(", ") || "folder"}`,
      seat: "operator",
      draft: true,
    };
    patches = [proposal, ...patches].slice(0, 16);
    ev = pushEvent(ev, rng, "patch", `draft ρ ${top.id} → ok (not applied)`, "strange");
  }

  const seatCount = (graph.findings ?? []).length + findings.length;
  ev = pushEvent(
    ev,
    rng,
    "eval",
    `JEV ${jevDone}/128 · seats ${seatCount} · drafts ${findings.length}`,
    "ok",
  );

  return { sessionFindings: findings, patchProposals: patches, events: ev };
}
