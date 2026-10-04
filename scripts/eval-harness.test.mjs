import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const graph = join(ROOT, "contracts", "swarm.sheaf.json");

test("eval ticks emit finding and patch events", () => {
  const r = spawnSync(
    "npx",
    ["tsx", join(ROOT, "scripts", "pulse-run-cli.ts"), "--graph", graph, "--ticks", "28", "--json"],
    { cwd: ROOT, env: { ...process.env, SHEAF_PULSE_SEED: "99" }, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const kinds = r.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l).kind);
  assert.ok(kinds.includes("finding"), "reviewer finding events at eval tick");
  assert.ok(kinds.includes("patch"), "draft patch proposal at eval tick");
  assert.ok(kinds.filter((k) => k === "eval").length >= 2, "eval at 14 and 28");
});

test("contract includes EVAL.md seat findings", () => {
  const r = spawnSync("node", [join(ROOT, "scripts", "validate-sheaf.mjs")], { encoding: "utf8" });
  assert.match(r.stdout, /ok\s+swarm\.trunk/);
});
