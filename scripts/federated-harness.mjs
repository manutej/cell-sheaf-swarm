/**
 * Federated running-loop orchestrator for cellular sheaf swarms.
 * Multiple cell loops tick in parallel; a coordinator merges events,
 * runs four-seat eval (EVAL.md), and writes meta-learning weights.
 */

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** @typedef {"ok"|"strange"|"broken"|"missing"} GlueStatus */
/** @typedef {"idle"|"inflight"|"blocked"|"done"} AgentState */

/**
 * @param {unknown} raw
 * @returns {import("./federated-harness.mjs").SheafGraph}
 */
export function parseGraph(raw) {
  if (!raw || typeof raw !== "object") throw new Error("invalid graph");
  const g = /** @type {Record<string, unknown>} */ (raw);
  if (g.schema !== "sheaf-graph/2020-12") throw new Error("unsupported schema");
  return /** @type {import("./federated-harness.mjs").SheafGraph} */ (g);
}

/**
 * One simulation step — mirrors src/lib/swarm/store.ts pulse() for a cell subset.
 * @param {CellState} cell
 * @param {SheafGraph} graph
 */
export function pulseCell(cell, graph) {
  const tick = cell.tick + 1;
  const restrictions = graph.restrictions;
  let { agents, commits, events, jevDone, operad } = cell;

  for (const a of agents) {
    if (a.state === "inflight") {
      a.t = Math.min(1, (a.t ?? 0) + 0.18);
      a.ticksLeft = (a.ticksLeft ?? 0) - 1;
      if (a.ticksLeft <= 0) {
        const edge = restrictions.find((r) => r.id === a.edgeId);
        const st = edge?.status ?? "ok";
        if (st === "ok") {
          a.state = "done";
          a.t = 1;
          if (a.role === "worker") jevDone = Math.min(128, jevDone + 3);
          if (a.role === "kernel" || a.role === "fixer") {
            const sha = Math.random().toString(16).slice(2, 8);
            commits = [
              {
                sha,
                pillar: a.livesAt,
                message: a.task.slice(0, 28),
                onTrunk: true,
                at: tick,
              },
              ...commits,
            ].slice(0, 40);
            events = pushEvent(events, "commit", `${a.livesAt} · ${sha} folded`, "ok", cell.id);
          } else {
            events = pushEvent(events, "oc", `${a.id} ${a.role} · compose = collapse`, "ok", cell.id);
          }
          operad = operad.map((n) =>
            n.id === "q0" ? { ...n, oc: "agree", compose: "swarm", collapse: "trunk" } : n,
          );
        } else if (st === "strange") {
          a.state = "blocked";
          events = pushEvent(events, "block", `${a.id} strange ρ ${edge?.id}`, "strange", cell.id);
        } else {
          a.state = "blocked";
          events = pushEvent(events, "block", `${a.id} cannot fold on ${st} ρ`, st, cell.id);
        }
      }
    } else if (a.state === "done" && tick % 9 === a.id.charCodeAt(1) % 9) {
      a.state = "idle";
      a.t = 0;
    } else if (a.state === "blocked" && a.role === "fixer" && tick % 11 === 0) {
      a.state = "inflight";
      a.ticksLeft = 4;
      a.t = 0;
      a.task = "prove repair by run";
      events = pushEvent(events, "fix", `${a.id} re-enters on ${a.edgeId}`, "strange", cell.id);
    }
  }

  const idle = agents.filter((a) => a.state === "idle");
  const inflight = agents.filter((a) => a.state === "inflight").length;
  if (idle.length && inflight < 4 && tick % 2 === 0) {
    const pick = idle[tick % idle.length];
    pick.state = "inflight";
    pick.t = 0;
    pick.ticksLeft = 3 + (tick % 3);
    const edges = restrictions.filter((r) => r.source === pick.livesAt || r.target === pick.livesAt);
    pick.edgeId = edges[tick % Math.max(1, edges.length)]?.id ?? pick.edgeId;
    events = pushEvent(events, "launch", `${pick.role} ${pick.id} · ${pick.task}`, "ok", cell.id);
  }

  if (tick % 14 === 0) {
    events = pushEvent(
      events,
      "eval",
      `JEV ${jevDone}/128 · cell ${cell.id}`,
      "ok",
      cell.id,
    );
  }

  cell.tick = tick;
  cell.agents = agents;
  cell.commits = commits;
  cell.events = events;
  cell.jevDone = jevDone;
  cell.operad = operad;
}

/**
 * @param {SwarmEvent[]} events
 * @param {SwarmEvent["kind"]} kind
 * @param {string} text
 * @param {GlueStatus} [status]
 * @param {string} [cellId]
 */
function pushEvent(events, kind, text, status, cellId) {
  const next = {
    id: "e" + Math.random().toString(36).slice(2, 8),
    at: Date.now(),
    kind,
    text,
    status,
    cellId,
  };
  return [next, ...events].slice(0, 64);
}

/**
 * Partition agents into federated cells by pillar kind bands.
 * @param {SheafGraph} graph
 * @returns {CellState[]}
 */
export function seedFederation(graph) {
  const agents = (graph.agents ?? []).map((a) => ({
    ...a,
    edgeId: a.edgeId ?? null,
    t: a.t ?? 0,
    ticksLeft: a.ticksLeft ?? 0,
    state: a.state === "inflight" ? "idle" : a.state,
  }));
  const kindOf = (livesAt) => graph.pillars.find((p) => p.id === livesAt)?.kind ?? "app";

  const bands = [
    { id: "cell-core", kinds: new Set(["core", "lib"]) },
    { id: "cell-apps", kinds: new Set(["app"]) },
    { id: "cell-mem", kinds: new Set(["mem"]) },
  ];

  return bands.map((band) => ({
    id: band.id,
    tick: 0,
    jevDone: 0,
    agents: agents.filter((a) => band.kinds.has(kindOf(a.livesAt))),
    commits: [...(graph.commits ?? [])],
    operad: (graph.operad ?? []).map((n) => ({ ...n })),
    events: [
      {
        id: "e0",
        at: Date.now(),
        kind: "roll",
        text: `${band.id} federated from ${graph.id}`,
        status: "ok",
        cellId: band.id,
      },
    ],
  }));
}

/**
 * Four-seat eval harness (contracts/EVAL.md) over federation snapshot.
 * @param {SheafGraph} graph
 * @param {CellState[]} cells
 * @param {Record<string, number>} repairWeights
 */
export function evalSeats(graph, cells, repairWeights) {
  const open = graph.pillars.filter((p) =>
    graph.restrictions.some(
      (r) => (r.source === p.id || r.target === p.id) && r.status === "ok",
    ),
  ).length;
  const blocked = cells.flatMap((c) => c.agents).filter((a) => a.state === "blocked").length;
  const strange = graph.restrictions.filter((r) => r.status === "strange").length;
  const broken = graph.restrictions.filter((r) => r.status === "broken").length;
  const q0 = cells[0]?.operad.find((n) => n.id === "q0");
  const jev = cells.reduce((s, c) => s + c.jevDone, 0);

  /** @type {{ seat: string, sev: string, claim: string, pass: boolean }[]} */
  const seats = [];

  seats.push({
    seat: "user",
    sev: open < graph.pillars.length * 0.6 ? "P0" : "P2",
    claim: open < graph.pillars.length ? "Not every folder may fold yet" : "Trunk readable",
    pass: open >= graph.pillars.length * 0.6,
  });
  seats.push({
    seat: "operator",
    sev: blocked > 2 ? "P0" : "P1",
    claim: blocked > 0 ? `${blocked} agents blocked on ρ` : "No blocked agents",
    pass: blocked <= 2,
  });
  seats.push({
    seat: "craft",
    sev: strange > broken ? "P1" : "P2",
    claim: `${strange} strange vs ${broken} broken maps`,
    pass: strange <= broken + 1,
  });
  seats.push({
    seat: "red",
    sev: q0?.oc === "pending" && jev < 32 ? "P0" : "P1",
    claim:
      q0?.oc === "agree"
        ? "Compose agrees with collapse"
        : "Operad still pending — views may be costume",
    pass: q0?.oc === "agree" || jev >= 32,
  });

  const topRepair = [...graph.restrictions]
    .filter((r) => r.status !== "ok")
    .sort((a, b) => (repairWeights[b.id] ?? 0) - (repairWeights[a.id] ?? 0))[0];

  return { seats, jev, open, topRepair };
}

/**
 * Meta-learning: bump repair weights from block events this round.
 * @param {Record<string, number>} weights
 * @param {CellState[]} cells
 * @param {number} round
 * @param {string} logPath
 */
export function metaLearn(weights, cells, round, logPath) {
  mkdirSync(dirname(logPath), { recursive: true });
  for (const cell of cells) {
    for (const ev of cell.events) {
      if (ev.kind !== "block") continue;
      const m = ev.text.match(/ρ ([\w-]+)/);
      const edgeId = m?.[1];
      if (!edgeId) continue;
      const before = weights[edgeId] ?? 0;
      weights[edgeId] = before + 1;
      appendFileSync(
        logPath,
        JSON.stringify({
          round,
          cellId: ev.cellId,
          edgeId,
          delta: 1,
          weight: weights[edgeId],
          at: ev.at,
        }) + "\n",
      );
    }
  }
}

/**
 * @param {SheafGraph} graph
 * @param {{ rounds?: number, logPath?: string }} [opts]
 */
export function runFederation(graph, opts = {}) {
  const rounds = opts.rounds ?? 48;
  const logPath = opts.logPath ?? join(ROOT, ".meta-learning", "federation.jsonl");
  const cells = seedFederation(graph);
  /** @type {Record<string, number>} */
  const repairWeights = {};
  /** @type {ReturnType<typeof evalSeats>[]} */
  const history = [];

  for (let round = 0; round < rounds; round++) {
    for (const cell of cells) {
      pulseCell(cell, graph);
    }
    metaLearn(repairWeights, cells, round, logPath);
    history.push(evalSeats(graph, cells, repairWeights));
  }

  const last = history[history.length - 1];
  return {
    cells,
    repairWeights,
    history,
    last,
    logPath,
    passes: last.seats.every((s) => s.pass),
  };
}

/**
 * @param {string} contractPath
 * @param {{ rounds?: number, outReport?: string }} [opts]
 */
export function runFromContract(contractPath, opts = {}) {
  const raw = JSON.parse(readFileSync(contractPath, "utf8"));
  const graph = parseGraph(raw);
  const result = runFederation(graph, { rounds: opts.rounds });
  if (opts.outReport) {
    writeFileSync(
      opts.outReport,
      JSON.stringify(
        {
          contract: graph.id,
          rounds: opts.rounds ?? 48,
          passes: result.passes,
          jev: result.last.jev,
          repairWeights: result.repairWeights,
          seats: result.last.seats,
          topRepair: result.last.topRepair?.id ?? null,
        },
        null,
        2,
      ),
    );
  }
  return result;
}
