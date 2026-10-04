import type { Agent, Commit, GlueStatus, OperadNode, SheafGraph, SwarmEvent } from "./types";
import { DISPATCH_ROLES, type WorkerAdapter } from "./worker";

export const MAX_PULSE_EVENTS = 48;

export type PulseClockState = {
  tick: number;
  jevDone: number;
  agents: Agent[];
  commits: Commit[];
  events: SwarmEvent[];
  operad: OperadNode[];
};

export type PulseRng = {
  eventId: () => string;
  commitSha: () => string;
  now: () => number;
};

export function defaultPulseRng(): PulseRng {
  return {
    eventId: () => "e" + Math.random().toString(36).slice(2, 8),
    commitSha: () => Math.random().toString(16).slice(2, 8),
    now: () => Date.now(),
  };
}

export function seedPulseFromGraph(graph: SheafGraph, note: string, rng: PulseRng = defaultPulseRng()): PulseClockState {
  return {
    tick: 0,
    jevDone: 0,
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
        at: rng.now(),
        kind: "roll",
        text: note,
        status: "ok",
      },
    ],
  };
}

function pushEvent(
  events: SwarmEvent[],
  rng: PulseRng,
  kind: SwarmEvent["kind"],
  text: string,
  status?: GlueStatus,
): SwarmEvent[] {
  const next: SwarmEvent = { id: rng.eventId(), at: rng.now(), kind, text, status };
  return [next, ...events].slice(0, MAX_PULSE_EVENTS);
}

export type PulseStepOptions = {
  rng?: PulseRng;
  /** When set, worker/planner inflight completion uses adapter instead of raw ρ only. */
  adapter?: WorkerAdapter;
};

/** One swarm clock tick — pure, no React/Zustand. */
export function pulseStep(
  state: PulseClockState,
  graph: SheafGraph,
  options: PulseStepOptions | PulseRng = {},
): PulseClockState {
  const opts: PulseStepOptions =
    typeof options === "object" && options !== null && "eventId" in options
      ? { rng: options as PulseRng }
      : (options as PulseStepOptions);
  const rng = opts.rng ?? defaultPulseRng();
  const adapter = opts.adapter;
  const tick = state.tick + 1;
  const restrictions = graph.restrictions;
  const findings = graph.findings ?? [];
  const arts = graph.artifacts ?? [];
  let agents = state.agents.map((a) => ({ ...a }));
  let commits = state.commits;
  let events = state.events;
  let jevDone = state.jevDone;
  let operad = state.operad;

  for (const a of agents) {
    if (a.state === "inflight") {
      a.t = Math.min(1, (a.t ?? 0) + 0.18);
      a.ticksLeft = (a.ticksLeft ?? 0) - 1;
      if (a.ticksLeft <= 0) {
        const edge = restrictions.find((r) => r.id === a.edgeId);
        let st = edge?.status ?? "ok";
        if (adapter && DISPATCH_ROLES.has(a.role)) {
          const result = adapter.run({
            agentId: a.id,
            role: a.role,
            edgeId: a.edgeId ?? null,
            task: a.task,
            livesAt: a.livesAt,
            edgeStatus: st,
          });
          if (result.status === "blocked") {
            a.state = "blocked";
            events = pushEvent(
              events,
              rng,
              "block",
              result.reason ?? `${a.id} worker blocked`,
              st === "ok" ? "strange" : st,
            );
            continue;
          }
          a.state = "done";
          a.t = 1;
          if (a.role === "worker") jevDone = Math.min(128, jevDone + 3);
          events = pushEvent(
            events,
            rng,
            "oc",
            `${a.id} ${adapter.name} · ${result.reason ?? "worker ok"}`,
            "ok",
          );
          continue;
        }
        if (st === "ok") {
          a.state = "done";
          a.t = 1;
          if (a.role === "worker") jevDone = Math.min(128, jevDone + 3);
          if (a.role === "kernel" || a.role === "fixer") {
            const sha = rng.commitSha();
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
            events = pushEvent(events, rng, "commit", `${pillar} · ${sha} folded`, "ok");
          } else {
            events = pushEvent(events, rng, "oc", `${a.id} ${a.role} · compose = collapse`, "ok");
          }
          operad = operad.map((n) =>
            n.id === "q0" ? { ...n, oc: "agree", compose: "swarm", collapse: "trunk" } : n,
          );
        } else if (st === "strange") {
          a.state = "blocked";
          events = pushEvent(
            events,
            rng,
            "block",
            `${a.id} strange ρ ${edge?.id} — needs a person`,
            "strange",
          );
        } else {
          a.state = "blocked";
          events = pushEvent(events, rng, "block", `${a.id} cannot fold on ${st} ρ`, st);
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
      events = pushEvent(events, rng, "fix", `${a.id} re-enters on ${a.edgeId}`, "strange");
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
    events = pushEvent(events, rng, "launch", `${pick.role} ${pick.id} · ${pick.task}`, "ok");
  }

  if (tick % 14 === 0) {
    events = pushEvent(
      events,
      rng,
      "eval",
      `JEV ${jevDone}/128 · seats ${findings.length} · arts ${arts.length}`,
      "ok",
    );
  }

  return { tick, jevDone, agents, commits, events, operad };
}
