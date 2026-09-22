#!/usr/bin/env node
/**
 * Zero-dep checker for contracts/*.sheaf.json.
 * Mirrors src/lib/swarm/load-sheaf.ts rollIssues so CI can run without Zod.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "contracts");
const SCHEMA = "sheaf-graph/2020-12";
const GLUE = new Set(["ok", "strange", "broken", "missing"]);
const KINDS = new Set(["identity", "projection", "embed", "spectral", "type-aware"]);
const PILLAR_KIND = new Set(["core", "lib", "app", "mem"]);
const ROLES = new Set(["planner", "worker", "reviewer", "fixer", "kernel", "detector"]);
const STATES = new Set(["idle", "inflight", "blocked", "done"]);
const OC = new Set(["agree", "diverge", "pending"]);
const SEATS = new Set(["user", "operator", "craft", "red"]);
const SEV = new Set(["P0", "P1", "P2"]);
const LAST_FOLDER = /^[^/\\]+$/;

function fail(issues, msg) {
  issues.push(msg);
}

function unique(ids, label, issues) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(issues, `duplicate ${label} id "${id}"`);
    seen.add(id);
  }
}

function need(obj, keys, label, issues) {
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === "") {
      fail(issues, `${label} missing ${k}`);
    }
  }
}

export function rollIssues(g) {
  const issues = [];
  if (!g || typeof g !== "object") return ["graph is not an object"];
  if (g.schema !== SCHEMA) fail(issues, `schema must be ${SCHEMA}`);
  if (!g.id) fail(issues, "id required");
  if (!Array.isArray(g.pillars) || g.pillars.length < 1) fail(issues, "pillars required");
  if (!Array.isArray(g.restrictions)) fail(issues, "restrictions required");

  unique((g.pillars ?? []).map((p) => p.id), "pillar", issues);
  unique((g.restrictions ?? []).map((r) => r.id), "restriction", issues);

  const pillars = new Set((g.pillars ?? []).map((p) => p.id));
  const types = new Set((g.types ?? []).map((t) => t.id));
  const edges = new Set((g.restrictions ?? []).map((r) => r.id));

  for (const p of g.pillars ?? []) {
    need(p, ["id", "folder", "kind", "known", "dim", "x", "z"], `pillar ${p.id ?? "?"}`, issues);
    if (p.folder && !LAST_FOLDER.test(p.folder)) {
      fail(issues, `pillar "${p.id}" folder must be last-folder, got "${p.folder}"`);
    }
    if (p.kind && !PILLAR_KIND.has(p.kind)) fail(issues, `pillar ${p.id} bad kind`);
  }

  for (const r of g.restrictions ?? []) {
    need(r, ["id", "source", "target", "relation", "kind", "status", "residual"], `ρ ${r.id ?? "?"}`, issues);
    if (r.kind && !KINDS.has(r.kind)) fail(issues, `ρ ${r.id} bad kind`);
    if (r.status && !GLUE.has(r.status)) fail(issues, `ρ ${r.id} bad status`);
    if (!pillars.has(r.source)) fail(issues, `ρ ${r.id} source "${r.source}" is not a pillar`);
    if (!pillars.has(r.target)) fail(issues, `ρ ${r.id} target "${r.target}" is not a pillar`);
    if (r.source === r.target) fail(issues, `ρ ${r.id} cannot restrict a pillar to itself`);
  }

  for (const c of g.commits ?? []) {
    need(c, ["sha", "pillar", "message", "onTrunk"], `commit ${c.sha ?? "?"}`, issues);
    if (c.sha && (String(c.sha).length < 6 || String(c.sha).length > 40)) {
      fail(issues, `commit ${c.sha} sha length`);
    }
    if (!pillars.has(c.pillar)) fail(issues, `commit ${c.sha} pillar "${c.pillar}" is not a pillar`);
    if (c.onTrunk) {
      const incident = (g.restrictions ?? []).filter(
        (r) => r.source === c.pillar || r.target === c.pillar,
      );
      const ok = incident.some((r) => r.status === "ok");
      if (incident.length > 0 && !ok) {
        fail(issues, `commit ${c.sha} onTrunk but pillar "${c.pillar}" has no ok ρ`);
      }
    }
  }

  for (const a of g.agents ?? []) {
    need(a, ["id", "role", "state", "livesAt", "task"], `agent ${a.id ?? "?"}`, issues);
    if (a.role && !ROLES.has(a.role)) fail(issues, `agent ${a.id} bad role`);
    if (a.state && !STATES.has(a.state)) fail(issues, `agent ${a.id} bad state`);
    if (!pillars.has(a.livesAt)) fail(issues, `agent ${a.id} livesAt "${a.livesAt}" is not a pillar`);
    if (a.edgeId && !edges.has(a.edgeId)) fail(issues, `agent ${a.id} edgeId "${a.edgeId}" is not a ρ`);
  }

  for (const n of g.operad ?? []) {
    need(n, ["id", "question", "sort", "prompt", "oc"], `operad ${n.id ?? "?"}`, issues);
    if (n.oc && !OC.has(n.oc)) fail(issues, `operad ${n.id} bad oc`);
    if (n.prompt && (!n.prompt.includes("SLOT[") || !n.prompt.includes("sort="))) {
      fail(issues, `operad ${n.id} prompt must be SLOT[<id>] sort=<Sort> · …`);
    }
    if (n.parent && !(g.operad ?? []).some((o) => o.id === n.parent)) {
      fail(issues, `operad ${n.id} parent "${n.parent}" is missing`);
    }
  }

  for (const f of g.findings ?? []) {
    need(f, ["id", "seat", "sev", "claim", "evidence"], `finding ${f.id ?? "?"}`, issues);
    if (f.seat && !SEATS.has(f.seat)) fail(issues, `finding ${f.id} bad seat`);
    if (f.sev && !SEV.has(f.sev)) fail(issues, `finding ${f.id} bad sev`);
  }

  for (const art of g.artifacts ?? []) {
    need(art, ["id", "folder", "type", "maps", "status"], `artifact ${art.id ?? "?"}`, issues);
    if (!pillars.has(art.maps)) fail(issues, `artifact ${art.id} maps "${art.maps}" is not a pillar`);
    if (types.size && !types.has(art.type)) fail(issues, `artifact ${art.id} type "${art.type}" is not a type disc`);
    if (art.status && !GLUE.has(art.status)) fail(issues, `artifact ${art.id} bad status`);
  }

  return issues;
}

export function validateFile(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return { path, id: raw.id, issues: rollIssues(raw) };
}

function main() {
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".sheaf.json"))
    .map((f) => join(DIR, f));
  if (!files.length) {
    console.error("no *.sheaf.json in contracts/");
    process.exit(1);
  }
  let bad = 0;
  for (const f of files) {
    const { id, issues } = validateFile(f);
    if (issues.length) {
      bad += 1;
      console.error(`FAIL ${id ?? f}`);
      for (const i of issues) console.error(`  - ${i}`);
    } else {
      console.log(`ok  ${id}`);
    }
  }
  if (bad) process.exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
