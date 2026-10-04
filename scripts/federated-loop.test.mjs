import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parseGraph, runFederation, seedFederation } from "./federated-harness.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

test("federation seeds three cells from swarm specimen", () => {
  const raw = JSON.parse(readFileSync(join(ROOT, "contracts", "swarm.sheaf.json"), "utf8"));
  const graph = parseGraph(raw);
  const cells = seedFederation(graph);
  assert.equal(cells.length, 3);
  const totalAgents = cells.reduce((n, c) => n + c.agents.length, 0);
  assert.equal(totalAgents, (graph.agents ?? []).length);
});

test("federated run produces eval history and repair weights", () => {
  const raw = JSON.parse(readFileSync(join(ROOT, "contracts", "swarm.sheaf.json"), "utf8"));
  const graph = parseGraph(raw);
  const result = runFederation(graph, { rounds: 24 });
  assert.ok(result.history.length === 24);
  assert.ok(typeof result.repairWeights === "object");
  assert.ok(result.last.seats.length === 4);
});
