import type { GlueStatus, SheafGraph } from "./types";

const RANK: Record<GlueStatus, number> = { broken: 0, missing: 1, strange: 2, ok: 3 };

export function statusLine(status: GlueStatus): string {
  if (status === "broken") return "won't fold";
  if (status === "missing") return "no map";
  if (status === "strange") return "needs a person";
  return "may fold";
}

export type Blocker = {
  id: string;
  status: GlueStatus;
  residual: number;
  source: string;
  target: string;
  from: string;
  to: string;
  relation: string;
  meaning: string;
  line: string;
};

export function folderOf(graph: SheafGraph, id: string): string {
  return graph.pillars.find((p) => p.id === id)?.folder ?? id;
}

export function blockers(graph: SheafGraph): Blocker[] {
  return graph.restrictions
    .filter((r) => r.status !== "ok")
    .map((r) => {
      const from = folderOf(graph, r.source);
      const to = folderOf(graph, r.target);
      return {
        id: r.id,
        status: r.status,
        residual: r.residual,
        source: r.source,
        target: r.target,
        from,
        to,
        relation: r.relation,
        meaning: r.residualMeaning ?? "",
        line: statusLine(r.status),
      };
    })
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.residual - a.residual);
}

export function openCount(graph: SheafGraph): number {
  return graph.pillars.filter((p) =>
    graph.restrictions.some(
      (r) => (r.source === p.id || r.target === p.id) && r.status === "ok",
    ),
  ).length;
}

export function verdict(graph: SheafGraph): string {
  const blocks = blockers(graph);
  const open = openCount(graph);
  if (!blocks.length) {
    return `Every map commutes. ${open} folders may fold.`;
  }
  const lead = blocks.slice(0, 2).map((b) => {
    if (b.status === "missing") return `${b.to} has no map`;
    if (b.status === "broken") return `${b.from} → ${b.to} will not fold`;
    return `${b.from} → ${b.to} needs a person`;
  });
  const more = blocks.length - lead.length;
  return `${open} of ${graph.pillars.length} may fold. ${lead.join(". ")}.${more ? ` ${more} more.` : ""}`;
}
