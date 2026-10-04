import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const graph = join(ROOT, "contracts", "swarm.sheaf.json");

test("local adapter records worker ok on legal rho", () => {
  const r = spawnSync(
    "npx",
    [
      "tsx",
      join(ROOT, "scripts", "pulse-run-cli.ts"),
      "--graph",
      graph,
      "--ticks",
      "40",
      "--adapter",
      "local",
      "--json",
    ],
    {
      cwd: ROOT,
      env: { ...process.env, SHEAF_PULSE_SEED: "7" },
      encoding: "utf8",
    },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const lines = r.stdout.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const workerOk = lines.find((e) => e.kind === "oc" && String(e.text).includes("local-shell"));
  assert.ok(workerOk, "expected local-shell worker completion event");
  const jevLines = lines.filter((e) => e.kind === "oc" && String(e.text).includes("local-shell"));
  assert.ok(jevLines.length >= 1);
});

test("local adapter blocks worker on broken r-op path", () => {
  const r = spawnSync(
    "npx",
    ["tsx", join(ROOT, "scripts", "pulse-run-cli.ts"), "--graph", graph, "--ticks", "40", "--adapter", "local", "--json"],
    { cwd: ROOT, env: { ...process.env, SHEAF_PULSE_SEED: "7" }, encoding: "utf8" },
  );
  assert.equal(r.status, 0);
  const blocks = r.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((e) => e.kind === "block" && String(e.text).includes("broken"));
  assert.ok(blocks.length >= 1, "expected block on broken rho for ops worker");
});
