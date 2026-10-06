#!/usr/bin/env node
/**
 * Phase 4 gate: operad q0 (+ optional JEV) must be agreed before trunk claims pass.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function parseArgv(argv) {
  const contracts = [];
  let statePath = null;
  let jevRequired = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--state") {
      statePath = argv[++i];
      continue;
    }
    if (a === "--jev") {
      jevRequired = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (a.startsWith("-")) {
      return { error: `unknown flag ${a}` };
    }
    contracts.push(a);
  }
  if (jevRequired != null && !statePath) {
    return { error: "--jev requires --state" };
  }
  if (statePath != null && jevRequired == null) {
    return { error: "--state requires --jev" };
  }
  if (!contracts.length) {
    return { error: "usage: operad-q0-check.mjs <contract>... [--state <path> --jev <int>]" };
  }
  return { contracts, statePath, jevRequired };
}

function loadJson(path) {
  try {
    return { ok: true, data: JSON.parse(readFileSync(path, "utf8")) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function composeCollapseOc(q0) {
  const compose = q0.compose ?? "pending";
  const collapse = q0.collapse ?? "pending";
  const oc = q0.oc ?? "pending";
  return { compose, collapse, oc };
}

function fieldPending(v) {
  return v === undefined || v === null || v === "" || v === "pending";
}

/**
 * @returns {{ exit: 0|1|2, line: string }}
 */
export function assessQ0(graph, { jevDone, jevRequired } = {}) {
  const id = graph?.id ?? "?";
  if (!graph || typeof graph !== "object") {
    return { exit: 2, line: `${id}: q0 error (invalid graph)` };
  }
  if (!Array.isArray(graph.operad)) {
    return { exit: 2, line: `${id}: q0 error (no operad)` };
  }
  const q0 = graph.operad.find((n) => n.id === "q0");
  if (!q0) {
    return { exit: 2, line: `${id}: q0 error (missing q0)` };
  }

  const { compose, collapse, oc } = composeCollapseOc(q0);

  if (oc === "diverge") {
    return { exit: 1, line: `${id}: q0 diverged` };
  }

  const q0Agreed =
    oc === "agree" && !fieldPending(compose) && !fieldPending(collapse);

  if (q0Agreed) {
    if (jevRequired != null) {
      const done = typeof jevDone === "number" ? jevDone : 0;
      if (done < jevRequired) {
        return { exit: 1, line: `${id}: q0 pending jev ${done}/${jevRequired}` };
      }
    }
    return { exit: 0, line: `${id}: q0 agreed` };
  }

  return {
    exit: 1,
    line: `${id}: q0 pending (compose=${compose}, collapse=${collapse}, oc=${oc})`,
  };
}

export function assessFile(path, opts = {}) {
  const loaded = loadJson(path);
  if (!loaded.ok) {
    const base = path.split(/[/\\]/).pop() ?? path;
    return { exit: 2, line: `${base}: q0 error (${loaded.message})` };
  }
  const graph = loaded.data;
  const id = graph.id ?? path;
  const result = assessQ0(graph, opts);
  if (result.exit === 2 && !result.line.includes(graph.id ?? "")) {
    return { exit: 2, line: `${id}: q0 error` };
  }
  return result;
}

function main() {
  const parsed = parseArgv(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(2);
  }

  let jevDone;
  if (parsed.statePath != null) {
    const st = loadJson(parsed.statePath);
    if (!st.ok) {
      console.error(`state: ${st.message}`);
      process.exit(2);
    }
    jevDone = st.data?.jevDone;
    if (typeof jevDone !== "number") {
      console.error("state: jevDone must be a number");
      process.exit(2);
    }
  }

  let exit = 0;
  for (const path of parsed.contracts) {
    const { exit: code, line } = assessFile(path, {
      jevDone,
      jevRequired: parsed.jevRequired,
    });
    console.log(line);
    exit = Math.max(exit, code);
  }
  process.exit(exit);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
