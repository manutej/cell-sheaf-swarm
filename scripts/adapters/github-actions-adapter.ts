import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkerAdapter, WorkerResult, WorkerTask } from "../../src/lib/swarm/worker.ts";
import { localShellAdapter } from "../../src/lib/swarm/worker.ts";

const OUT_DIR = join(process.cwd(), ".swarm-worker");

/**
 * Records workflow_dispatch payload; optionally stubs ok for CI via SHEAF_WORKER_STUB_OK=1.
 * Real dispatch: set SHEAF_GH_WORKFLOW=swarm-worker.yml and have `gh` available.
 */
export function createGitHubActionsAdapter(): WorkerAdapter {
  return {
    name: "github-actions",
    run(task: WorkerTask): WorkerResult {
      mkdirSync(OUT_DIR, { recursive: true });
      const payload = { ...task, at: new Date().toISOString() };
      const path = join(OUT_DIR, "dispatch.jsonl");
      appendFileSync(path, JSON.stringify(payload) + "\n");
      writeFileSync(join(OUT_DIR, "last-dispatch.json"), JSON.stringify(payload, null, 2));

      if (process.env.SHEAF_WORKER_STUB_OK === "1") {
        return localShellAdapter.run(task);
      }

      const wf = process.env.SHEAF_GH_WORKFLOW;
      if (wf) {
        try {
          execSync(
            `gh workflow run ${wf} -f agentId=${task.agentId} -f edgeId=${task.edgeId ?? ""} -f task=${JSON.stringify(task.task)}`,
            { stdio: "ignore" },
          );
        } catch {
          return {
            status: "blocked",
            reason: `${task.agentId} gh workflow dispatch failed`,
            backend: "github-actions",
          };
        }
      }

      return {
        status: "blocked",
        reason: `${task.agentId} dispatch queued (no SHEAF_WORKER_STUB_OK)`,
        backend: "github-actions",
      };
    },
  };
}
