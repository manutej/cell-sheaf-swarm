import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  importedGraph,
  repairLabel,
  repairs,
  verdict,
} from "../src/lib/swarm/insight.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const load = (name) =>
  JSON.parse(readFileSync(join(ROOT, "contracts", name), "utf8"));

test("authored swarm is not imported", () => {
  assert.equal(importedGraph(load("swarm.sheaf.json")), false);
});

test("authored paper verdict unchanged shape", () => {
  const g = load("paper.sheaf.json");
  const v = verdict(g);
  assert.match(v, /Fix .* and the trunk closes\./);
  assert.ok(repairs(g).every((f) => !f.unverified));
});

test("imported probe: x-sas marks graph imported", () => {
  const g = { ...load("swarm.sheaf.json"), id: "probe-xsas", "x-sas": {} };
  assert.equal(importedGraph(g), true);
  const top = repairs(g)[0];
  assert.equal(top.unverified, true);
  assert.doesNotMatch(repairLabel(top), /\bfix\b/i);
  assert.doesNotMatch(verdict(g), /\bfix\b|may fold/i);
  assert.match(repairLabel(top), /link to missing page|\bcheck\b/i);
});
