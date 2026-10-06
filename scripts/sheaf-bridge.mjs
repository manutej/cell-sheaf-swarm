#!/usr/bin/env node
/**
 * Bidirectional SheafGraph bridge: cell-sheaf-swarm (pillars/restrictions) ↔ stalks-and-sections (nodes/edges).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { rollIssues } from "./validate-sheaf.mjs";

const SCHEMA = "sheaf-graph/2020-12";
const LAST_FOLDER = /^[^/\\]+$/;
const KIND_TO_LEVEL = { core: 0, lib: 1, app: 2, mem: 3 };
const PILLAR_KIND = new Set(["core", "lib", "app", "mem"]);
const RESTRICT_KINDS = new Set(["identity", "projection", "embed", "spectral", "type-aware"]);
const SWARM_TOP_STASH = [
  "schema",
  "palette",
  "commits",
  "agents",
  "operad",
  "findings",
  "types",
  "artifacts",
];
const SAS_TOP_STASH = ["$schema", "kicker", "blurb", "residualMeaning", "eval"];

export function sortKeysDeep(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeysDeep(value[k]);
  }
  return out;
}

export function deepEqualSorted(a, b) {
  return JSON.stringify(sortKeysDeep(a)) === JSON.stringify(sortKeysDeep(b));
}

function circleLayout(count, index) {
  const r = 120;
  const a = (2 * Math.PI * index) / Math.max(count, 1);
  return {
    x: Math.round(Math.cos(a) * r * 100) / 100,
    z: Math.round(Math.sin(a) * r * 100) / 100,
  };
}

function isSwarmGraph(g) {
  return g && typeof g === "object" && g.schema === SCHEMA && Array.isArray(g.pillars);
}

function isSasGraph(g) {
  return g && typeof g === "object" && Array.isArray(g.levels) && Array.isArray(g.nodes) && !Array.isArray(g.pillars);
}

function sasEdgeList(g) {
  if (Array.isArray(g.edges)) return { field: "edges", list: g.edges };
  if (Array.isArray(g.triples)) return { field: "triples", list: g.triples };
  return { field: "edges", list: [] };
}

function buildLevelsFromKinds(usedLevelIds) {
  const labels = { 0: "core", 1: "lib", 2: "app", 3: "mem" };
  return [...usedLevelIds]
    .sort((a, b) => a - b)
    .map((id) => ({ id, label: labels[id] ?? `L${id}` }));
}

function levelsAreDerived(nodes, levels) {
  const used = new Set((nodes ?? []).map((n) => (typeof n.level === "number" ? n.level : 0)));
  const built = buildLevelsFromKinds(used);
  const slim = (levels ?? []).map(({ id, label }) => ({ id, label }));
  return JSON.stringify(built) === JSON.stringify(slim);
}

function edgeMetaKey(e, i) {
  return e.id ?? `${e.source}\t${e.target}\t${i}`;
}

function pruneEmpty(obj) {
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
      pruneEmpty(obj[k]);
      if (!Object.keys(obj[k]).length) delete obj[k];
    }
  }
}

export function toSas(g) {
  if (!isSwarmGraph(g)) throw new Error("toSas: input is not a swarm sheaf graph");
  const issues = rollIssues(g);
  if (issues.length) throw new Error(`toSas: invalid swarm graph: ${issues[0]}`);

  const xSasPillars = g["x-sas"]?.pillars ?? {};
  const xSasRestrictions = g["x-sas"]?.restrictions ?? {};
  const usedLevels = new Set();

  const nodes = (g.pillars ?? []).map((p) => {
    const stash = xSasPillars[p.id] ?? {};
    const level = typeof stash.level === "number" ? stash.level : (KIND_TO_LEVEL[p.kind] ?? 0);
    usedLevels.add(level);
    const node = {
      id: p.id,
      title: stash.title ?? p.folder,
      level,
      dim: p.dim,
      known: p.known,
    };
    if (!stash._omitKind) {
      node.kind = stash.kind ?? p.kind;
    }
    if (stash.section) node.section = stash.section;
    if (stash.summary) node.summary = stash.summary;
    if (stash.sources) node.sources = stash.sources;
    for (const k of Object.keys(stash)) {
      if (["title", "kind", "section", "summary", "sources", "_generated", "_omitKind"].includes(k)) continue;
      node[k] = stash[k];
    }
    const gen = stash._generated ?? [];
    if (!gen.includes("x") || !gen.includes("z")) {
      const xSwarm = {};
      if (!gen.includes("x")) xSwarm.x = p.x;
      if (!gen.includes("z")) xSwarm.z = p.z;
      if (Object.keys(xSwarm).length) node["x-swarm"] = xSwarm;
    }
    return node;
  });

  const edges = (g.restrictions ?? []).map((r, i) => {
    const meta = xSasRestrictions[r.id] ?? xSasRestrictions[`${r.source}\t${r.target}\t${i}`] ?? {};
    const edge = {
      source: r.source,
      target: r.target,
    };
    const gen = meta._generated ?? [];
    if (!gen.includes("id") && r.id) edge.id = r.id;
    const usePredicate = meta.usePredicate === true;
    if (usePredicate) edge.predicate = r.relation;
    else edge.relation = r.relation;
    if (r.kind) edge.restrictKind = r.kind;
    if (!gen.includes("residual") && r.residual !== undefined) edge.residual = r.residual;
    if (r.note) edge.note = r.note;
    const xs = {};
    if (r.status !== undefined && !meta.defaultStatus) xs.status = r.status;
    if (r.residualMeaning !== undefined) xs.residualMeaning = r.residualMeaning;
    if (Object.keys(xs).length) edge["x-swarm"] = xs;
    return edge;
  });

  const out = {
    id: g.id,
    title: g.title ?? g.id,
    levels: g["x-sas"]?.levels ?? buildLevelsFromKinds(usedLevels),
    nodes,
    edges,
  };

  const xSwarm = {};
  for (const k of SWARM_TOP_STASH) {
    if (k === "schema") continue;
    if (g[k] !== undefined) xSwarm[k] = g[k];
  }
  const hasOtherSwarmPayload = Object.keys(xSwarm).length > 0;
  if (hasOtherSwarmPayload && g.schema !== undefined) xSwarm.schema = g.schema;
  if (g["x-swarm"] && typeof g["x-swarm"] === "object") {
    for (const [k, v] of Object.entries(g["x-swarm"])) {
      if (k !== "pillars" && k !== "restrictions") xSwarm[k] = v;
    }
  }
  if (Object.keys(xSwarm).length) out["x-swarm"] = xSwarm;

  if (g["x-sas"]?._edgeField === "triples") {
    out.triples = edges;
    delete out.edges;
  }

  for (const k of SAS_TOP_STASH) {
    if (g["x-sas"]?.[k] !== undefined) out[k] = g["x-sas"][k];
    else if (g[k] !== undefined && !SWARM_TOP_STASH.includes(k)) out[k] = g[k];
  }

  return out;
}

export function toSwarm(y) {
  if (!isSasGraph(y)) throw new Error("toSwarm: input is not a stalks-and-sections sheaf graph");

  const { field: edgeField, list: rawEdges } = sasEdgeList(y);
  const nodeIds = new Set((y.nodes ?? []).map((n) => n.id));
  for (let i = 0; i < rawEdges.length; i++) {
    const e = rawEdges[i];
    if (!e?.source || !e?.target) throw new Error(`toSwarm: edge[${i}] missing source or target`);
    if (!nodeIds.has(e.source)) throw new Error(`toSwarm: edge[${i}] unknown source ${e.source}`);
    if (!nodeIds.has(e.target)) throw new Error(`toSwarm: edge[${i}] unknown target ${e.target}`);
    if (e.source === e.target) throw new Error(`toSwarm: edge[${i}] self-edge ${e.source}`);
  }

  const xSwarmTop = y["x-swarm"] && typeof y["x-swarm"] === "object" ? y["x-swarm"] : {};
  const xSas = { ...(y["x-sas"] && typeof y["x-sas"] === "object" ? y["x-sas"] : {}) };
  xSas.pillars = xSas.pillars ?? {};
  xSas.restrictions = xSas.restrictions ?? {};

  if (Array.isArray(y.levels) && y.levels.length && !levelsAreDerived(y.nodes, y.levels)) {
    xSas.levels = y.levels;
  }

  const pillars = (y.nodes ?? []).map((n, i) => {
    const xs = n["x-swarm"] && typeof n["x-swarm"] === "object" ? n["x-swarm"] : {};
    const level = typeof n.level === "number" ? n.level : 0;
    const defaultKind = level === 0 ? "core" : "lib";
    let kind = PILLAR_KIND.has(n.kind) ? n.kind : defaultKind;
    const layout = xs.x !== undefined && xs.z !== undefined ? { x: xs.x, z: xs.z } : circleLayout(y.nodes.length, i);
    const generated = [];
    if (xs.x === undefined) generated.push("x");
    if (xs.z === undefined) generated.push("z");

    let folder;
    if (LAST_FOLDER.test(n.title)) folder = n.title;
    else folder = String(n.id).replace(/[/\\]/g, "-");

    const pillar = {
      id: n.id,
      folder,
      kind,
      known: n.known ?? false,
      dim: n.dim,
      x: xs.x ?? layout.x,
      z: xs.z ?? layout.z,
    };

    const nodeStash = {};
    if (n.title !== folder) nodeStash.title = n.title;
    if (n.kind) {
      if (n.kind !== kind && n.kind !== defaultKind) nodeStash.kind = n.kind;
    } else {
      nodeStash._omitKind = true;
    }
    const mappedLevel = PILLAR_KIND.has(kind) ? KIND_TO_LEVEL[kind] : defaultKind === "core" ? 0 : 1;
    if (typeof n.level === "number" && n.level !== mappedLevel) nodeStash.level = n.level;
    if (n.section) nodeStash.section = n.section;
    if (n.summary) nodeStash.summary = n.summary;
    if (n.sources) nodeStash.sources = n.sources;
    for (const k of Object.keys(n)) {
      if (["id", "title", "kind", "level", "dim", "known", "section", "summary", "sources", "x-swarm"].includes(k)) {
        continue;
      }
      nodeStash[k] = n[k];
    }
    if (generated.length) nodeStash._generated = generated;
    if (Object.keys(nodeStash).length) xSas.pillars[n.id] = { ...xSas.pillars[n.id], ...nodeStash };
    return pillar;
  });

  const restrictions = rawEdges.map((e, i) => {
    const exs = e["x-swarm"] && typeof e["x-swarm"] === "object" ? e["x-swarm"] : {};
    const hadId = e.id !== undefined && e.id !== null && e.id !== "";
    const id = hadId ? e.id : `e${i}`;
    const generated = [];
    if (!hadId) generated.push("id");

    const hasRelation = e.relation !== undefined;
    const relation = e.relation ?? e.predicate ?? "related_to";
    const usePredicate = !hasRelation && e.predicate !== undefined;

    const kind = e.restrictKind && RESTRICT_KINDS.has(e.restrictKind) ? e.restrictKind : "identity";
    let residual = e.residual;
    if (residual === undefined) {
      residual = 0;
      generated.push("residual");
    }

    let status = "strange";
    if (exs.status !== undefined) status = exs.status;

    const r = {
      id,
      source: e.source,
      target: e.target,
      relation,
      kind,
      status,
      residual,
    };
    if (e.note) r.note = e.note;
    if (exs.residualMeaning !== undefined) r.residualMeaning = exs.residualMeaning;

    const meta = { usePredicate, _generated: [...generated] };
    if (status === "strange" && exs.status === undefined) meta.defaultStatus = true;
    if (meta.usePredicate || meta._generated.length || meta.defaultStatus) {
      xSas.restrictions[id] = meta;
      xSas.restrictions[edgeMetaKey(e, i)] = meta;
    }
    return r;
  });

  const out = {
    schema: SCHEMA,
    id: y.id,
    title: y.title ?? y.id,
    pillars,
    restrictions,
  };

  for (const k of SWARM_TOP_STASH) {
    if (xSwarmTop[k] !== undefined) out[k] = xSwarmTop[k];
  }
  if (edgeField === "triples") {
    xSas._edgeField = "triples";
  }

  const xSasOut = { ...xSas };
  for (const k of SAS_TOP_STASH) {
    if (y[k] !== undefined) xSasOut[k] = y[k];
  }
  pruneEmpty(xSasOut);
  if (Object.keys(xSasOut).length) out["x-sas"] = xSasOut;

  const swarmIssues = rollIssues(out);
  if (swarmIssues.length) throw new Error(`toSwarm: produced invalid swarm graph: ${swarmIssues[0]}`);
  return out;
}

function main() {
  const [cmd, file] = process.argv.slice(2);
  if (!cmd || !file || (cmd !== "to-sas" && cmd !== "to-swarm")) {
    console.error("usage: sheaf-bridge.mjs to-sas|to-swarm <in.json>");
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  let out;
  try {
    out = cmd === "to-sas" ? toSas(raw) : toSwarm(raw);
  } catch (err) {
    console.error(String(err.message ?? err));
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
