import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { rollIssues, validateFile } from "./validate-sheaf.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

test("catalog specimens pass", () => {
  for (const name of ["swarm.sheaf.json", "paper.sheaf.json", "blank.sheaf.json"]) {
    const { issues, id } = validateFile(join(ROOT, "contracts", name));
    assert.equal(issues.length, 0, `${id}: ${issues.join("; ")}`);
  }
});

test("onTrunk is refused when every incident ρ is broken", () => {
  const issues = rollIssues({
    schema: "sheaf-graph/2020-12",
    id: "bad.trunk",
    pillars: [
      { id: "trunk", folder: "trunk", kind: "core", known: true, dim: 1, x: 0, z: 0 },
      { id: "ops", folder: "ops", kind: "app", known: false, dim: 1, x: 1, z: 1 },
    ],
    restrictions: [
      {
        id: "r1",
        source: "trunk",
        target: "ops",
        relation: "emits",
        kind: "embed",
        status: "broken",
        residual: 1,
      },
    ],
    commits: [{ sha: "abcdef", pillar: "ops", message: "no", onTrunk: true }],
  });
  assert.ok(issues.some((i) => i.includes("onTrunk")));
});

test("last-folder rejects paths", () => {
  const issues = rollIssues({
    schema: "sheaf-graph/2020-12",
    id: "path.trunk",
    pillars: [
      { id: "trunk", folder: "src/lib/swarm", kind: "core", known: true, dim: 1, x: 0, z: 0 },
    ],
    restrictions: [],
  });
  assert.ok(issues.some((i) => i.includes("last-folder")));
});
