import { create } from "zustand";
import { downloadSheaf, snapshotSheaf, tryParseSheaf } from "./load-sheaf";
import { CATALOG, SWARM_GRAPH } from "./specimen";
import { defaultPulseRng, pulseStep, seedPulseFromGraph } from "./pulse-core";
import type { Agent, Commit, OperadNode, SheafGraph, SwarmEvent, ViewMode } from "./types";

function seedFrom(graph: SheafGraph, note: string): Pick<
  SwarmState,
  "graph" | "agents" | "commits" | "events" | "operad" | "tick" | "jevDone" | "selected" | "focusEdge" | "sheetOpen" | "loadError"
> {
  const clock = seedPulseFromGraph(graph, note, defaultPulseRng());
  return {
    graph,
    ...clock,
    selected: null,
    focusEdge: null,
    sheetOpen: false,
    loadError: null,
  };
}

export type SwarmState = {
  graph: SheafGraph;
  mode: ViewMode;
  paused: boolean;
  tick: number;
  jevDone: number;
  agents: Agent[];
  commits: Commit[];
  events: SwarmEvent[];
  operad: OperadNode[];
  selected: string | null;
  focusEdge: string | null;
  sheetOpen: boolean;
  loadError: string | null;
  setMode: (m: ViewMode) => void;
  stepMode: (dir: number) => void;
  togglePause: () => void;
  select: (id: string | null) => void;
  lookAt: (edgeId: string) => void;
  setSheet: (open: boolean) => void;
  loadGraph: (raw: unknown, note?: string) => boolean;
  loadCatalog: (id: string) => boolean;
  exportGraph: () => void;
  pulse: () => void;
};

const MODES: ViewMode[] = ["swarm", "commits", "live", "operad", "eval", "subspaces"];

export const useSwarm = create<SwarmState>((set, get) => ({
  ...seedFrom(SWARM_GRAPH, `${SWARM_GRAPH.id} · ${SWARM_GRAPH.title ?? "rolled"}`),
  mode: "swarm",
  paused: false,
  setMode: (mode) => set({ mode, sheetOpen: false }),
  stepMode: (dir) => {
    const { mode } = get();
    const i = MODES.indexOf(mode);
    const next = MODES[(i + dir + MODES.length) % MODES.length];
    set({ mode: next, sheetOpen: false });
  },
  togglePause: () => set({ paused: !get().paused }),
  select: (selected) => set({ selected, focusEdge: null, sheetOpen: !!selected }),
  lookAt: (edgeId) => {
    const r = get().graph.restrictions.find((x) => x.id === edgeId);
    if (!r) return;
    set({
      focusEdge: edgeId,
      selected: r.target,
      sheetOpen: true,
    });
  },
  setSheet: (sheetOpen) => set({ sheetOpen, selected: sheetOpen ? get().selected : null }),
  loadGraph: (raw, note) => {
    const parsed = tryParseSheaf(raw);
    if (!parsed.ok) {
      set({ loadError: parsed.error });
      return false;
    }
    set({
      ...seedFrom(parsed.graph, note ?? `rolled ${parsed.graph.id}`),
    });
    return true;
  },
  loadCatalog: (id) => {
    const g = CATALOG.find((c) => c.id === id);
    if (!g) {
      set({ loadError: `unknown contract ${id}` });
      return false;
    }
    set({ ...seedFrom(g, `${g.id} · ${g.title ?? "catalog"}`) });
    return true;
  },
  exportGraph: () => {
    const s = get();
    downloadSheaf(snapshotSheaf(s.graph, { commits: s.commits, agents: s.agents, operad: s.operad }));
  },
  pulse: () => {
    const s = get();
    if (s.paused) return;
    const next = pulseStep(
      {
        tick: s.tick,
        jevDone: s.jevDone,
        agents: s.agents,
        commits: s.commits,
        events: s.events,
        operad: s.operad,
      },
      s.graph,
      { rng: defaultPulseRng() },
    );
    set(next);
  },
}));

export const MODES_LIST = MODES;
export { CATALOG };
