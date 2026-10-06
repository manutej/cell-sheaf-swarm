import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deepEqualSorted, toSas, toSwarm } from "./sheaf-bridge.mjs";
import { rollIssues } from "./validate-sheaf.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SAS_ROOT = "/Users/cairo/rig-work/glue/repos/stalks-and-sections";
const HERMES = join(SAS_ROOT, "docs/examples/hermes-agent.json");
const PAPER = join(ROOT, "contracts/paper.sheaf.json");

function validateSas(path) {
  execFileSync("node", [join(SAS_ROOT, "scripts/sheaf/validate.mjs"), path], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("paper.sheaf.json round-trips through SAS", () => {
  const paper = JSON.parse(readFileSync(PAPER, "utf8"));
  const sas = toSas(paper);
  validateSasFromObject(sas, "paper.sas.tmp.json");
  const back = toSwarm(sas);
  assert.equal(rollIssues(back).length, 0);
  assert.ok(deepEqualSorted(paper, back));
  assert.equal(sas.nodes.length, 6);
  assert.equal(sas.edges.length, 8);
});

test("hermes-agent.json round-trips through swarm", () => {
  const hermes = JSON.parse(readFileSync(HERMES, "utf8"));
  const swarm = toSwarm(hermes);
  assert.equal(swarm.pillars.length, 31);
  assert.equal(swarm.restrictions.length, 29);
  assert.ok(swarm.restrictions.every((r) => r.status === "strange"));
  assert.equal(rollIssues(swarm).length, 0);
  const back = toSas(swarm);
  validateSasFromObject(back, "hermes.sas.tmp.json");
  assert.ok(deepEqualSorted(hermes, back));
});

test("inline swarm → SAS with predicate and triples aliases", () => {
  const swarm = {
    schema: "sheaf-graph/2020-12",
    id: "mini.trunk",
    pillars: [{ id: "a", folder: "a", kind: "core", known: true, dim: 2, x: 0, z: 0 }],
    restrictions: [
      {
        id: "r1",
        source: "a",
        target: "a",
        relation: "loop",
        kind: "identity",
        status: "ok",
        residual: 0,
      },
    ],
  };
  assert.throws(() => toSas(swarm), /invalid swarm/);
});

test("inline SAS → swarm with predicate and triples", () => {
  const sas = {
    id: "mini-sas",
    title: "Mini",
    levels: [{ id: 0, label: "L0" }],
    nodes: [{ id: "n1", title: "n1", level: 0, dim: 3, known: true }],
    triples: [{ source: "n1", target: "n1", predicate: "relates" }],
  };
  assert.throws(() => toSwarm(sas), /self-edge/);

  const sas2 = {
    id: "mini-sas",
    title: "Mini",
    levels: [{ id: 0, label: "L0" }],
    nodes: [
      { id: "n1", title: "n1", level: 0, dim: 3, known: true },
      { id: "n2", title: "n2", level: 0, dim: 3, known: false },
    ],
    triples: [{ source: "n1", target: "n2", predicate: "relates", restrictKind: "embed" }],
  };
  const swarm = toSwarm(sas2);
  assert.equal(swarm.restrictions[0].relation, "relates");
  const back = toSas(swarm);
  assert.ok(Array.isArray(back.triples));
  assert.equal(back.triples[0].predicate, "relates");
  assert.ok(deepEqualSorted(sas2, back));
});

test("relation edits survive conversion", () => {
  const hermes = JSON.parse(readFileSync(HERMES, "utf8"));
  hermes.edges[0] = { ...hermes.edges[0], relation: "edited_once" };
  const swarm = toSwarm(hermes);
  swarm.restrictions[0].relation = "edited_twice";
  const sas = toSas(swarm);
  assert.equal(sas.edges[0].relation, "edited_twice");
  const swarm2 = toSwarm(sas);
  assert.equal(swarm2.restrictions[0].relation, "edited_twice");
});

function validateSasFromObject(obj, name) {
  const dir = mkdtempSync(join(tmpdir(), "sheaf-bridge-test-"));
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(obj));
  try {
    validateSas(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
