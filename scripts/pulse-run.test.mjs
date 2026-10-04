import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const graph = join(ROOT, "contracts", "swarm.sheaf.json");

test("20 seeded ticks emit expected event kind sequence", () => {
  const r = spawnSync(
    "npx",
    ["--yes", "tsx", join(ROOT, "scripts", "pulse-run-cli.ts"), "--graph", graph, "--ticks", "20", "--json"],
    {
      cwd: ROOT,
      env: { ...process.env, SHEAF_PULSE_SEED: "42" },
      encoding: "utf8",
    },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const kinds = r.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line).kind);
  assert.ok(kinds.includes("launch"), "expected launch events");
  assert.ok(kinds.some((k) => k === "block" || k === "commit" || k === "oc"), "expected resolution events");
  assert.deepEqual(
    kinds.filter((k) => k === "eval").length,
    1,
    "tick 14 should emit one eval event in 20 ticks",
  );
});
