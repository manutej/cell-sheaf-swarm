import type { AgentRole, GlueStatus } from "./types";

/** Roles that complete inflight work through an external worker backend. */
export const DISPATCH_ROLES: ReadonlySet<AgentRole> = new Set(["worker", "planner"]);

export type WorkerTask = {
  agentId: string;
  role: AgentRole;
  edgeId: string | null;
  task: string;
  livesAt: string;
  edgeStatus: GlueStatus;
};

export type WorkerResult = {
  status: "ok" | "blocked";
  reason?: string;
  backend?: string;
};

export type WorkerAdapter = {
  name: string;
  run(task: WorkerTask): WorkerResult;
};

/** Simulates in-process: edge glue law only (Phase 1 behavior for UI). */
export const simulateAdapter: WorkerAdapter = {
  name: "simulate",
  run(task) {
    if (task.edgeStatus === "ok") return { status: "ok", backend: "simulate" };
    return {
      status: "blocked",
      reason: `${task.agentId} cannot fold on ${task.edgeStatus} ρ`,
      backend: "simulate",
    };
  },
};

/**
 * Local dev backend: ok only on legal ρ; broken/missing on ops emit path stay blocked (r-op demo).
 */
export const localShellAdapter: WorkerAdapter = {
  name: "local-shell",
  run(task) {
    if (task.edgeStatus === "ok") {
      return { status: "ok", backend: "local-shell", reason: task.task.slice(0, 40) };
    }
    if (task.edgeStatus === "strange") {
      return {
        status: "blocked",
        reason: `${task.agentId} strange ρ ${task.edgeId} — needs a person`,
        backend: "local-shell",
      };
    }
    return {
      status: "blocked",
      reason: `${task.agentId} worker blocked on ${task.edgeStatus} ρ ${task.edgeId ?? "?"}`,
      backend: "local-shell",
    };
  },
};
