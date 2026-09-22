import { create } from "zustand";
import { downloadSheaf, snapshotSheaf, tryParseSheaf } from "./load-sheaf";
import { CATALOG, SWARM_GRAPH } from "./specimen";
import type {
  Agent,
  Commit,
  GlueStatus,
  OperadNode,
  SheafGraph,
  SwarmEvent,
  ViewMode,
} from "./types";

const MAX_EVENTS = 48;

function nid(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 8);
}

function pushEvent(
  events: SwarmEvent[],
  kind: SwarmEvent["kind"],
  text: string,
  status?: GlueStatus,
): SwarmEvent[] {
  const next: SwarmEvent = { id: nid("e"), at: Date.now(), kind, text, status };
  return [next, ...events].slice(0, MAX_EVENTS);
}

function seedFrom(graph: SheafGraph, note: string): Pick<
  SwarmState,
  "graph" | "agents" | "commits" | "events" | "operad" | "tick" | "jevDone" | "selected" | "focusEdge" | "sheetOpen" | "loadError"
> {
  return {
    graph,
    agents: (graph.agents ?? []).map((a) => ({
      ...a,
      edgeId: a.edgeId ?? null,
      t: a.t ?? 0,
      ticksLeft: a.ticksLeft ?? 0,
      state: a.state === "inflight" ? "idle" : a.state,
    })),
    commits: [...(graph.commits ?? [])],
    operad: (graph.operad ?? []).map((n) => ({ ...n })),
    events: [
      {
        id: "e0",
        at: Date.now(),
        kind: "roll",
        text: note,
        status: "ok",
      },
    ],
    tick: 0,
    jevDone: 0,
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
    const tick = s.tick + 1;
    const restrictions = s.graph.restrictions;
    const findings = s.graph.findings ?? [];
    const arts = s.graph.artifacts ?? [];
    let agents = s.agents.map((a) => ({ ...a }));
    let commits = s.commits;
    let events = s.events;
    let jevDone = s.jevDone;
    let operad = s.operad;

    for (const a of agents) {
      if (a.state === "inflight") {
        a.t = Math.min(1, (a.t ?? 0) + 0.18);
        a.ticksLeft = (a.ticksLeft ?? 0) - 1;
        if (a.ticksLeft <= 0) {
          const edge = restrictions.find((r) => r.id === a.edgeId);
          const st = edge?.status ?? "ok";
          if (st === "ok") {
            a.state = "done";
            a.t = 1;
            if (a.role === "worker") jevDone = Math.min(128, jevDone + 3);
            if (a.role === "kernel" || a.role === "fixer") {
              const sha = Math.random().toString(16).slice(2, 8);
              const pillar = a.livesAt;
              commits = [
                {
                  sha,
                  pillar,
                  message: a.task.slice(0, 28),
                  onTrunk: true,
                  at: tick,
                },
                ...commits,
              ].slice(0, 40);
              events = pushEvent(events, "commit", `${pillar} · ${sha} folded`, "ok");
            } else {
              events = pushEvent(events, "oc", `${a.id} ${a.role} · compose = collapse`, "ok");
            }
            operad = operad.map((n) =>
              n.id === "q0" ? { ...n, oc: "agree", compose: "swarm", collapse: "trunk" } : n,
            );
          } else if (st === "strange") {
            a.state = "blocked";
            events = pushEvent(events, "block", `${a.id} strange ρ ${edge?.id} — needs a person`, "strange");
          } else {
            a.state = "blocked";
            events = pushEvent(events, "block", `${a.id} cannot fold on ${st} ρ`, st);
          }
        }
      } else if (a.state === "done" && tick % 9 === a.id.charCodeAt(1) % 9) {
        a.state = "idle";
        a.t = 0;
      } else if (a.state === "blocked" && a.role === "fixer" && tick % 11 === 0) {
        a.state = "inflight";
        a.ticksLeft = 4;
        a.t = 0;
        a.task = "prove repair by run";
        events = pushEvent(events, "fix", `${a.id} re-enters on ${a.edgeId}`, "strange");
      }
    }

    const idle = agents.filter((a) => a.state === "idle");
    const inflight = agents.filter((a) => a.state === "inflight").length;
    if (idle.length && inflight < 4 && tick % 2 === 0) {
      const pick = idle[tick % idle.length];
      pick.state = "inflight";
      pick.t = 0;
      pick.ticksLeft = 3 + (tick % 3);
      const edges = restrictions.filter((r) => r.source === pick.livesAt || r.target === pick.livesAt);
      pick.edgeId = edges[tick % Math.max(1, edges.length)]?.id ?? pick.edgeId;
      events = pushEvent(events, "launch", `${pick.role} ${pick.id} · ${pick.task}`, "ok");
    }

    if (tick % 14 === 0) {
      events = pushEvent(
        events,
        "eval",
        `JEV ${jevDone}/128 · seats ${findings.length} · arts ${arts.length}`,
        "ok",
      );
    }

    set({ tick, agents, commits, events, jevDone, operad });
  },
}));

export const MODES_LIST = MODES;
export { CATALOG };
