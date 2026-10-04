#!/usr/bin/env node
/**
 * Headless pulse CLI — runs pulse-run-cli.ts via tsx (Phase 1).
 * usage: node scripts/pulse-run.mjs --graph contracts/swarm.sheaf.json --ticks 20 [--json]
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(ROOT, "scripts", "pulse-run-cli.ts");
const args = process.argv.slice(2);

const r = spawnSync("npx", ["--yes", "tsx", cli, ...args], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

process.exit(r.status === null ? 1 : r.status);
