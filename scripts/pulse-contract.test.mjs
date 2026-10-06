import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validateFile } from "./validate-sheaf.mjs";
import { assessFile } from "./operad-q0-check.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CLI = join(ROOT, "scripts", "pulse-contract.ts");
const PAPER = join(ROOT, "contracts", "paper.sheaf.json");
const LIVE = join(ROOT, "examples", "q0-live");

function referencePulse(ticks, seed) {
  const r = spawnSync(
    "npx",
    [
      "--yes",
      "tsx",
      "-e",
      `
import { readFileSync } from "node:fs";
import { parseSheaf } from "./src/lib/swarm/load-sheaf.ts";
import { pulseStep, seedPulseFromGraph } from "./src/lib/swarm/pulse-core.ts";
import { simulateAdapter } from "./src/lib/swarm/worker.ts";
import { seededRng } from "./scripts/pulse-contract.ts";
const ticks = ${ticks};
const seed = ${seed};
const raw = JSON.parse(readFileSync("contracts/paper.sheaf.json", "utf8"));
const graph = parseSheaf(raw);
const rng = seededRng(seed);
let state = seedPulseFromGraph(graph, graph.id + " · pulse-run", rng);
for (let i = 0; i < ticks; i++) state = pulseStep(state, graph, { rng, adapter: simulateAdapter });
console.log(JSON.stringify({ operad: state.operad, jevDone: state.jevDone, tick: state.tick }));
`,
    ],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, SHEAF_PULSE_SEED: String(seed) } },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout.trim());
}

function runContract(ticks, dir, seed = "1") {
  const out = join(dir, `paper-t${ticks}.sheaf.json`);
  const stateOut = join(dir, `paper-t${ticks}.state.json`);
  const r = spawnSync(
    "npx",
    ["--yes", "tsx", CLI, "--graph", PAPER, "--ticks", String(ticks), "--out", out, "--state-out", stateOut],
    { cwd: ROOT, env: { ...process.env, SHEAF_PULSE_SEED: seed }, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return { out, stateOut };
}

test("pulse-contract output validates and matches reference operad/jev", () => {
  const dir = mkdtempSync(join(tmpdir(), "pulse-contract-"));
  for (const ticks of [5, 12, 37, 150, 200]) {
    const { out, stateOut } = runContract(ticks, dir);
    const { issues, id } = validateFile(out);
    assert.equal(issues.length, 0, `${id}: ${issues.join("; ")}`);
    const sheaf = JSON.parse(readFileSync(out, "utf8"));
    const state = JSON.parse(readFileSync(stateOut, "utf8"));
    assert.equal(sheaf.pulse.ticks, ticks);
    assert.equal(sheaf.pulse.tick, ticks);
    assert.equal(state.tick, ticks);
    assert.equal(sheaf.pulse.jevDone, state.jevDone);
    const base = JSON.parse(readFileSync(PAPER, "utf8"));
    for (const key of Object.keys(base)) {
      if (key === "operad" || key === "pulse") continue;
      assert.deepEqual(sheaf[key], base[key], `field ${key} at tick ${ticks}`);
    }
    for (const node of base.operad) {
      if (node.id === "q0") continue;
      const got = sheaf.operad.find((n) => n.id === node.id);
      assert.deepEqual(got, node, `operad ${node.id} unchanged at tick ${ticks}`);
    }
  }
});

test("committed snapshots match base pulse-core reference runs", () => {
  for (const ticks of [5, 12, 200]) {
    const ref = referencePulse(ticks, 1);
    const sheaf = JSON.parse(readFileSync(join(LIVE, `paper-t${ticks}.sheaf.json`), "utf8"));
    const state = JSON.parse(readFileSync(join(LIVE, `paper-t${ticks}.state.json`), "utf8"));
    assert.deepEqual(sheaf.operad, ref.operad, `operad tick ${ticks}`);
    assert.equal(state.jevDone, ref.jevDone);
    assert.equal(state.tick, ref.tick);
  }
  for (const ticks of [37, 150]) {
    const ref = referencePulse(ticks, 1);
    const dir = mkdtempSync(join(tmpdir(), "pulse-ref-"));
    const { out, stateOut } = runContract(ticks, dir, "1");
    const sheaf = JSON.parse(readFileSync(out, "utf8"));
    const state = JSON.parse(readFileSync(stateOut, "utf8"));
    assert.deepEqual(sheaf.operad, ref.operad, `operad tick ${ticks}`);
    assert.deepEqual(state, { jevDone: ref.jevDone, tick: ref.tick });
  }
  const ref150s2 = referencePulse(150, 2);
  const dir = mkdtempSync(join(tmpdir(), "pulse-ref2-"));
  const { out, stateOut } = runContract(150, dir, "2");
  const sheaf = JSON.parse(readFileSync(out, "utf8"));
  const state = JSON.parse(readFileSync(stateOut, "utf8"));
  assert.deepEqual(sheaf.operad, ref150s2.operad);
  assert.deepEqual(state, { jevDone: ref150s2.jevDone, tick: ref150s2.tick });
});

test("committed q0-live snapshots pass gate story on paper seed 1", () => {
  const cases = [
    { tick: 5, jev: null, expectExit: 1, needle: "pending" },
    { tick: 12, jev: null, expectExit: 0, needle: "agreed" },
    { tick: 12, jev: 128, expectExit: 1, needle: "jev" },
    { tick: 200, jev: 128, expectExit: 0, needle: "agreed" },
  ];
  for (const { tick, jev, expectExit, needle } of cases) {
    const sheaf = join(LIVE, `paper-t${tick}.sheaf.json`);
    const state = join(LIVE, `paper-t${tick}.state.json`);
    const opts = jev != null ? { jevDone: JSON.parse(readFileSync(state, "utf8")).jevDone, jevRequired: jev } : {};
    const { exit, line } = assessFile(sheaf, opts);
    assert.equal(exit, expectExit, line);
    assert.ok(line.includes(needle), line);
  }
});

test("pulse-contract is byte-deterministic for same seed and ticks", () => {
  const dir = mkdtempSync(join(tmpdir(), "pulse-contract-det-"));
  const a = runContract(150, dir, "1");
  const dirB = join(dir, "b");
  mkdirSync(dirB, { recursive: true });
  const b = runContract(150, dirB, "1");
  assert.equal(readFileSync(a.out, "utf8"), readFileSync(b.out, "utf8"));
  assert.equal(readFileSync(a.stateOut, "utf8"), readFileSync(b.stateOut, "utf8"));
});

test("pulse-contract rejects missing args", () => {
  const r = spawnSync("npx", ["--yes", "tsx", CLI], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 2);
});
