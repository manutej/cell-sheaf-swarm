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
  swarm: "Moving",
  commits: "May fold",
  live: "In flight",
  operad: "Agrees",
  eval: "Wrong",
  subspaces: "Lives",
};

export const VIEW_BLURB: Record<ViewMode, string> = {
  swarm: "What is in the way of the work.",
  commits: "What may fold into trunk. Gold is already earned.",
  live: "What is moving on a map right now.",
  operad: "Does compose of the parts equal the whole.",
  eval: "Which promise cannot be kept.",
  subspaces: "Which type lives on which folder.",
};
