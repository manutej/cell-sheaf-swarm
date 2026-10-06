import { readFileSync, writeFileSync } from "node:fs";
import { parseSheaf } from "../src/lib/swarm/load-sheaf.ts";
import { pulseStep, seedPulseFromGraph, type PulseRng } from "../src/lib/swarm/pulse-core.ts";
import { simulateAdapter } from "../src/lib/swarm/worker.ts";

export type PulseContractState = { jevDone: number; tick: number };

export type RunPulseContractOptions = {
  graphPath: string;
  ticks: number;
  seed: number;
};

/** Same seeded RNG as scripts/pulse-run-cli.ts */
export function seededRng(seed: number): PulseRng {
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

/** Headless pulse run for contract snapshots — mirrors pulse-run-cli seeding and stepping. */
export function runPulseContract({ graphPath, ticks, seed }: RunPulseContractOptions): {
  sheaf: Record<string, unknown>;
  state: PulseContractState;
} {
  const raw = JSON.parse(readFileSync(graphPath, "utf8")) as Record<string, unknown>;
  const graph = parseSheaf(raw);
  const rng = seededRng(seed);
  let state = seedPulseFromGraph(graph, `${graph.id} · pulse-run`, rng);
  for (let i = 0; i < ticks; i++) {
    state = pulseStep(state, graph, { rng, adapter: simulateAdapter });
  }
  const sheaf: Record<string, unknown> = {
    ...raw,
    operad: state.operad,
    pulse: { ticks, seed, jevDone: state.jevDone, tick: state.tick },
  };
  return {
    sheaf,
    state: { jevDone: state.jevDone, tick: state.tick },
  };
}

function parseArgs(argv: string[]) {
  let graphPath = "";
  let ticks = 0;
  let outPath = "";
  let stateOutPath = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--graph") graphPath = argv[++i] ?? "";
    else if (a === "--ticks") ticks = Number(argv[++i] ?? 0);
    else if (a === "--out") outPath = argv[++i] ?? "";
    else if (a === "--state-out") stateOutPath = argv[++i] ?? "";
    else if (a.startsWith("-")) return { error: `unknown flag ${a}` };
  }
  if (!graphPath || !ticks || !outPath || !stateOutPath) {
    return {
      error:
        "usage: pulse-contract.ts --graph <path> --ticks <N> --out <contract.json> --state-out <state.json>",
    };
  }
  if (!Number.isInteger(ticks) || ticks < 1) {
    return { error: "--ticks must be a positive integer" };
  }
  return { graphPath, ticks, outPath, stateOutPath };
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    console.error(parsed.error);
    process.exit(2);
  }
  const seedEnv = process.env.SHEAF_PULSE_SEED;
  const seed = seedEnv ? Number(seedEnv) : 1;
  if (!Number.isFinite(seed)) {
    console.error("SHEAF_PULSE_SEED must be a number");
    process.exit(2);
  }
  const { sheaf, state } = runPulseContract({
    graphPath: parsed.graphPath,
    ticks: parsed.ticks,
    seed,
  });
  writeFileSync(parsed.outPath, JSON.stringify(sheaf, null, 2) + "\n");
  writeFileSync(parsed.stateOutPath, JSON.stringify(state, null, 2) + "\n");
}

const isMain = process.argv[1]?.endsWith("pulse-contract.ts");
if (isMain) main();
