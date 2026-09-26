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

export type Repair = Blocker & {
  opens: string[];
  closesTrunk: boolean;
};

export function folderOf(graph: SheafGraph, id: string): string {
  return graph.pillars.find((p) => p.id === id)?.folder ?? id;
}

function openIds(graph: SheafGraph, flipId?: string): Set<string> {
  const open = new Set<string>();
  for (const p of graph.pillars) {
    const hit = graph.restrictions.some(
      (r) =>
        (r.source === p.id || r.target === p.id) &&
        (r.status === "ok" || r.id === flipId),
    );
    if (hit) open.add(p.id);
  }
  return open;
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

/** One flip to ok. Opens = folders that gain their first legal incident. Trunk closes only when every folder has one. */
export function repairs(graph: SheafGraph): Repair[] {
  const before = openIds(graph);
  return blockers(graph)
    .map((b) => {
      const after = openIds(graph, b.id);
      const opens = graph.pillars.filter((p) => !before.has(p.id) && after.has(p.id)).map((p) => p.folder);
      const closesTrunk = graph.pillars.every((p) => after.has(p.id));
      return { ...b, opens, closesTrunk };
    })
    .sort((a, b) => {
      if (a.closesTrunk !== b.closesTrunk) return a.closesTrunk ? -1 : 1;
      if (a.opens.length !== b.opens.length) return b.opens.length - a.opens.length;
      return RANK[a.status] - RANK[b.status] || b.residual - a.residual;
    });
}

export function repairLabel(fix: Repair): string {
  if (fix.closesTrunk) return `${fix.from} → ${fix.to} · closes the trunk`;
  if (fix.opens.length) return `${fix.from} → ${fix.to} · opens ${fix.opens.join(", ")}`;
  return `${fix.from} → ${fix.to} · opens nothing`;
}

function closedNames(graph: SheafGraph, flipId?: string): string[] {
  const open = openIds(graph, flipId);
  return graph.pillars.filter((p) => !open.has(p.id)).map((p) => p.folder);
}

export function focusLine(graph: SheafGraph, edgeId: string): string {
  const r = graph.restrictions.find((x) => x.id === edgeId);
  if (!r) return "";
  const meaning = r.residualMeaning || statusLine(r.status);
  if (r.status === "ok") return meaning;
  const fix = repairs(graph).find((x) => x.id === edgeId);
  if (!fix) return meaning;
  if (fix.closesTrunk) return `This one map closes the trunk. ${meaning}`;
  if (fix.opens.length) {
    const still = closedNames(graph, edgeId);
    const tail = still.length ? `${still.join(", ")} still closed. ` : "";
    return `Opens ${fix.opens.join(", ")}. ${tail}${meaning}`;
  }
  const closed = closedNames(graph);
  const tail = closed.length ? `${closed.join(", ")} still closed. ` : "";
  return `Opens no new folder. ${tail}${meaning}`;
}

export function openCount(graph: SheafGraph): number {
  const open = openIds(graph);
  return graph.pillars.filter((p) => open.has(p.id)).length;
}

export function verdict(graph: SheafGraph): string {
  const fixes = repairs(graph);
  const open = openCount(graph);
  const n = graph.pillars.length;
  if (!fixes.length) return `Every map commutes. ${open} folders may fold.`;
  const best = fixes[0];
  if (!best.opens.length) return `${open} of ${n} may fold. No single fix opens a new folder.`;
  if (best.closesTrunk) return `Fix ${best.from} → ${best.to} and the trunk closes.`;
  const still = n - open - best.opens.length;
  return `Fix ${best.from} → ${best.to} and ${best.opens.join(", ")} may fold. ${still} still closed.`;
}
