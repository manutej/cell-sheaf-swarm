import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseSheaf } from "../src/lib/swarm/load-sheaf.ts";
import {
  bannerText,
  importedGraph,
  repairs,
  verdict,
} from "../src/lib/swarm/insight.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const loadJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));

test("bridge import keeps x-sas and absent commits through parseSheaf", () => {
  const raw = loadJson("examples/bridge/hermes-agent.swarm.json");
  assert.ok(raw["x-sas"]);
  assert.equal("commits" in raw, false);

  const graph = parseSheaf(raw);
  assert.equal(importedGraph(graph), true);
  assert.ok(graph["x-sas"]);
  assert.equal(Array.isArray(graph.commits), false);

  const top = repairs(graph)[0];
  assert.ok(top);
  assert.equal(top.unverified, true);
  assert.doesNotMatch(verdict(graph), /\bfix\b.*may fold/i);
  assert.ok(bannerText(graph));
});

test("authored contracts parse with identical verdict and banner semantics", () => {
  for (const name of ["swarm.sheaf.json", "paper.sheaf.json"]) {
    const raw = loadJson(join("contracts", name));
    const graph = parseSheaf(raw);
    assert.equal(importedGraph(graph), false);
    assert.ok(Array.isArray(graph.commits));
  }

  const paper = parseSheaf(loadJson("contracts/paper.sheaf.json"));
  assert.match(verdict(paper), /Fix .* and the trunk closes\./);
  assert.ok(repairs(paper).every((f) => !f.unverified));
  assert.equal(bannerText(paper), null);
});

test("import without x-sas but no commits[] stays imported", () => {
  const raw = { ...loadJson("contracts/blank.sheaf.json"), id: "probe-no-commits" };
  delete raw.commits;
  delete raw["x-sas"];

  const graph = parseSheaf(raw);
  assert.equal(importedGraph(graph), true);
  assert.equal("x-sas" in graph, false);
  assert.equal(Array.isArray(graph.commits), false);
});
