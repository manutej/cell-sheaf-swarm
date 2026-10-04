import { readFileSync } from "node:fs";
import { parseSheaf } from "../src/lib/swarm/load-sheaf.ts";
import { defaultPulseRng, pulseStep, seedPulseFromGraph, type PulseRng } from "../src/lib/swarm/pulse-core.ts";

function parseArgs(argv: string[]) {
  let graphPath = "";
  let ticks = 20;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--graph") graphPath = argv[++i] ?? "";
    else if (a === "--ticks") ticks = Number(argv[++i] ?? 20);
    else if (a === "--json") json = true;
  }
  return { graphPath, ticks, json };
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

const { graphPath, ticks, json } = parseArgs(process.argv.slice(2));
if (!graphPath) {
  console.error("usage: pulse-run --graph <path> [--ticks N] [--json]");
  process.exit(2);
}

const raw = JSON.parse(readFileSync(graphPath, "utf8"));
const graph = parseSheaf(raw);
const seedEnv = process.env.SHEAF_PULSE_SEED;
const rng = seedEnv ? seededRng(Number(seedEnv)) : defaultPulseRng();
let state = seedPulseFromGraph(graph, `${graph.id} · pulse-run`, rng);

const emitted: { tick: number; kind: string }[] = [];

for (let i = 0; i < ticks; i++) {
  const prevLen = state.events.length;
  state = pulseStep(state, graph, rng);
  const newEvents = state.events.slice(0, state.events.length - prevLen);
  for (const e of newEvents) {
    emitted.push({ tick: state.tick, kind: e.kind });
    if (json) console.log(JSON.stringify({ tick: state.tick, kind: e.kind, text: e.text, status: e.status }));
  }
}

if (!json) {
  console.log(`pulse-run · ${graph.id} · ${ticks} ticks · JEV ${state.jevDone}/128`);
  console.log(
    emitted
      .map((e) => `${e.tick}:${e.kind}`)
      .join(" "),
  );
}
