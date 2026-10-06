import { readFileSync } from "node:fs";
import { createGitHubActionsAdapter } from "./adapters/github-actions-adapter.ts";
import { parseSheaf } from "../src/lib/swarm/load-sheaf.ts";
import { defaultPulseRng, pulseStep, seedPulseFromGraph, type PulseRng } from "../src/lib/swarm/pulse-core.ts";
import type { SwarmEvent } from "../src/lib/swarm/types.ts";
import { localShellAdapter, simulateAdapter, type WorkerAdapter } from "../src/lib/swarm/worker.ts";
import { appendRows } from "./tape.mjs";

function parseArgs(argv: string[]) {
  let graphPath = "";
  let ticks = 20;
  let json = false;
  let adapterName = "simulate";
  let tapePath = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--graph") graphPath = argv[++i] ?? "";
    else if (a === "--ticks") ticks = Number(argv[++i] ?? 20);
    else if (a === "--json") json = true;
    else if (a === "--adapter") adapterName = argv[++i] ?? "simulate";
    else if (a === "--tape") tapePath = argv[++i] ?? "";
  }
  return { graphPath, ticks, json, adapterName, tapePath };
}

function resolveAdapter(name: string): WorkerAdapter | undefined {
  if (name === "none" || name === "simulate") return simulateAdapter;
  if (name === "local") return localShellAdapter;
  if (name === "github") return createGitHubActionsAdapter();
  return simulateAdapter;
}

/** Deterministic RNG for snapshot tests (--json with SHEAF_PULSE_SEED=1). */
function seededRng(seed: number): PulseRng {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s;
  };
  return {
    eventId: () => "e" + next().toString(36).slice(0, 6),
    commitSha: () => next().toString(16).slice(0, 6),
    now: () => 1_700_000_000_000 + next(),
  };
}

function newEventsSince(prevHead: string | undefined, events: SwarmEvent[]): SwarmEvent[] {
  if (prevHead === undefined) return events;
  const idx = events.findIndex((e) => e.id === prevHead);
  if (idx === -1) {
    console.error("pulse-run: events dropped at cap");
    return events;
  }
  return events.slice(0, idx);
}

const { graphPath, ticks, json, adapterName, tapePath } = parseArgs(process.argv.slice(2));
if (!graphPath) {
  console.error(
    "usage: pulse-run --graph <path> [--ticks N] [--json] [--tape <path>] [--adapter simulate|local|github]",
  );
  process.exit(2);
}
const adapter = resolveAdapter(adapterName);

const raw = JSON.parse(readFileSync(graphPath, "utf8"));
const graph = parseSheaf(raw);
const seedEnv = process.env.SHEAF_PULSE_SEED;
const rng = seedEnv ? seededRng(Number(seedEnv)) : defaultPulseRng();
const runStartMs = Date.now();
let state = seedPulseFromGraph(graph, `${graph.id} · pulse-run`, rng);

const emitted: { tick: number; kind: string }[] = [];
const tapeRows: Record<string, unknown>[] = [];
let tapeSeq = 0;
const tapeKeyPrefix = seedEnv
  ? `pulse:${graph.id}:seed${seedEnv}`
  : `pulse:${graph.id}:run${runStartMs}`;

for (let i = 0; i < ticks; i++) {
  const prevHead = state.events[0]?.id;
  state = pulseStep(state, graph, { rng, adapter });
  const stepEvents = newEventsSince(prevHead, state.events);
  for (const e of stepEvents) {
    emitted.push({ tick: state.tick, kind: e.kind });
    if (json) console.log(JSON.stringify({ tick: state.tick, kind: e.kind, text: e.text, status: e.status }));
    if (tapePath) {
      const at = seedEnv
        ? new Date(1_700_000_000_000 + state.tick * 1000).toISOString()
        : new Date(e.at).toISOString();
      tapeRows.push({
        key: `${tapeKeyPrefix}:${state.tick}:${tapeSeq}`,
        command: "pulse",
        event: e.kind,
        payload: { id: e.id, text: e.text, status: e.status, graph: graph.id, tick: state.tick },
        at,
      });
      tapeSeq++;
    }
  }
}

if (tapePath && tapeRows.length > 0) {
  appendRows(tapePath, tapeRows);
}

if (!json) {
  console.log(`pulse-run · ${graph.id} · ${ticks} ticks · adapter ${adapter?.name} · JEV ${state.jevDone}/128`);
  console.log(
    emitted
      .map((e) => `${e.tick}:${e.kind}`)
      .join(" "),
  );
}
