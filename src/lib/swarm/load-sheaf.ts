import { SCHEMA_ID, SheafGraph, type Agent, type Commit, type SheafGraph as Graph } from "./types";

export type ParseOk = { ok: true; graph: Graph; warnings: string[] };
export type ParseFail = { ok: false; error: string; issues: string[] };
export type ParseResult = ParseOk | ParseFail;

const LAST_FOLDER = /^[^/\\]+$/;

function unique(ids: string[], label: string, issues: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push(`duplicate ${label} id "${id}"`);
    seen.add(id);
  }
}

/** ROLL.md checks that JSON Schema cannot express. */
export function rollIssues(g: Graph): string[] {
  const issues: string[] = [];
  unique(g.pillars.map((p) => p.id), "pillar", issues);
  unique(g.restrictions.map((r) => r.id), "restriction", issues);

  const pillars = new Set(g.pillars.map((p) => p.id));
  const types = new Set((g.types ?? []).map((t) => t.id));
  const edges = new Set(g.restrictions.map((r) => r.id));

  for (const p of g.pillars) {
    if (!LAST_FOLDER.test(p.folder)) {
      issues.push(`pillar "${p.id}" folder must be last-folder, got "${p.folder}"`);
    }
  }

  for (const r of g.restrictions) {
    if (!pillars.has(r.source)) issues.push(`ρ ${r.id} source "${r.source}" is not a pillar`);
    if (!pillars.has(r.target)) issues.push(`ρ ${r.id} target "${r.target}" is not a pillar`);
    if (r.source === r.target) issues.push(`ρ ${r.id} cannot restrict a pillar to itself`);
  }

  for (const c of g.commits ?? []) {
    if (!pillars.has(c.pillar)) issues.push(`commit ${c.sha} pillar "${c.pillar}" is not a pillar`);
    if (c.onTrunk) {
      const incident = (g.restrictions ?? []).filter(
        (r) => r.source === c.pillar || r.target === c.pillar,
      );
      const illegal = incident.filter((r) => r.status === "broken" || r.status === "missing");
      const ok = incident.some((r) => r.status === "ok");
      if (incident.length > 0 && !ok) {
        issues.push(`commit ${c.sha} onTrunk but pillar "${c.pillar}" has no ok ρ`);
      }
      if (illegal.length === incident.length && incident.length > 0) {
        issues.push(`commit ${c.sha} gold is not earned — every incident ρ is ${illegal[0]?.status}`);
      }
    }
  }

  for (const a of g.agents ?? []) {
    if (!pillars.has(a.livesAt)) issues.push(`agent ${a.id} livesAt "${a.livesAt}" is not a pillar`);
    if (a.edgeId && !edges.has(a.edgeId)) issues.push(`agent ${a.id} edgeId "${a.edgeId}" is not a ρ`);
  }

  for (const n of g.operad ?? []) {
    if (!n.prompt.includes("SLOT[") || !n.prompt.includes("sort=")) {
      issues.push(`operad ${n.id} prompt must be SLOT[<id>] sort=<Sort> · …`);
    }
    if (n.parent && !(g.operad ?? []).some((o) => o.id === n.parent)) {
      issues.push(`operad ${n.id} parent "${n.parent}" is missing`);
    }
  }

  for (const art of g.artifacts ?? []) {
    if (!pillars.has(art.maps)) issues.push(`artifact ${art.id} maps "${art.maps}" is not a pillar`);
    if (types.size && !types.has(art.type)) issues.push(`artifact ${art.id} type "${art.type}" is not a type disc`);
    if (art.status === "ok" && !pillars.has(art.maps)) {
      issues.push(`artifact ${art.id} ok but lives-at is unknown`);
    }
  }

  return issues;
}

export function normalizeSheaf(g: Graph): Graph {
  return {
    ...g,
    schema: SCHEMA_ID,
    commits: (g.commits ?? []).map((c) => ({ ...c, at: c.at ?? 0 })),
    agents: (g.agents ?? []).map(
      (a): Agent => ({
        ...a,
        edgeId: a.edgeId ?? null,
        t: a.t ?? 0,
        ticksLeft: a.ticksLeft ?? 0,
      }),
    ),
    operad: g.operad ?? [],
    findings: g.findings ?? [],
    types: g.types ?? [],
    artifacts: g.artifacts ?? [],
  };
}

export function tryParseSheaf(raw: unknown): ParseResult {
  const parsed = SheafGraph.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "graph"}: ${i.message}`);
    return { ok: false, error: issues[0] ?? "invalid sheaf", issues };
  }
  const graph = normalizeSheaf(parsed.data);
  const extra = rollIssues(graph);
  if (extra.length) {
    return { ok: false, error: extra[0], issues: extra };
  }
  return { ok: true, graph, warnings: [] };
}

export function parseSheaf(raw: unknown): Graph {
  const r = tryParseSheaf(raw);
  if (!r.ok) throw new Error(r.issues.join("\n"));
  return r.graph;
}

export function snapshotSheaf(
  graph: Graph,
  live: { commits: Commit[]; agents: Agent[]; operad: Graph["operad"] },
): Graph {
  return normalizeSheaf({
    ...graph,
    commits: live.commits,
    agents: live.agents.map((a) => ({
      ...a,
      state: a.state === "inflight" ? "idle" : a.state,
      t: 0,
      ticksLeft: 0,
    })),
    operad: live.operad,
  });
}

export function downloadSheaf(graph: Graph) {
  const name = `${graph.id.replace(/[^\w.-]+/g, "-")}.sheaf.json`;
  const blob = new Blob([JSON.stringify(graph, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
