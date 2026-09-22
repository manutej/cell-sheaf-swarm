import blankJson from "../../../contracts/blank.sheaf.json";
import paperJson from "../../../contracts/paper.sheaf.json";
import swarmJson from "../../../contracts/swarm.sheaf.json";
import { parseSheaf } from "./load-sheaf";
import type { SheafGraph, ViewMode } from "./types";

export const SWARM_GRAPH = parseSheaf(swarmJson);
export const PAPER_GRAPH = parseSheaf(paperJson);
export const BLANK_GRAPH = parseSheaf(blankJson);

export const CATALOG: SheafGraph[] = [SWARM_GRAPH, PAPER_GRAPH, BLANK_GRAPH];

export function graphById(id: string): SheafGraph | undefined {
  return CATALOG.find((g) => g.id === id);
}

export const VIEW_LABEL: Record<ViewMode, string> = {
  swarm: "Swarm",
  commits: "Commits",
  live: "Live",
  operad: "Operad",
  eval: "Eval",
  subspaces: "Subspaces",
};

export const VIEW_BLURB: Record<ViewMode, string> = {
  swarm: "Agents as pulses on the sheaf. Emerald while in flight. Color of the curve is glue, not taste.",
  commits: "Last-folder pillars. Gold dots already restrict to trunk. Silver waits on a green ρ.",
  live: "Only in-flight work is bright. Kernel, detector, reviewers, fixer — OAH roles as inspiration, not a fork.",
  operad: "Question tree. Compose of parts must equal collapse of the whole. Typed prompts sit on every node.",
  eval: "Four seats. P0 is a promise the operator cannot perform. Findings are from this volume.",
  subspaces: "Type discs above. Artifacts drop onto lower sheaf nodes. lives-at is the restriction.",
};
