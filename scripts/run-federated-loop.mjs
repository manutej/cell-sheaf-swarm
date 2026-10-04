#!/usr/bin/env node
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runFromContract } from "./federated-harness.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const contract = process.argv[2] ?? join(ROOT, "contracts", "swarm.sheaf.json");
const rounds = Number(process.argv[3] ?? 48);
const outReport = join(ROOT, ".meta-learning", "last-report.json");

const result = runFromContract(contract, { rounds, outReport });

console.log(`Federated loop · ${result.cells.length} cells · ${rounds} rounds`);
console.log(`JEV total: ${result.last.jev}/128 · eval pass: ${result.passes}`);
for (const s of result.last.seats) {
  console.log(`  [${s.seat}] ${s.sev} ${s.pass ? "✓" : "✗"} — ${s.claim}`);
}
if (result.last.topRepair) {
  console.log(`Top repair (meta-learned): ${result.last.topRepair.id} (${result.last.topRepair.status})`);
}
console.log(`Meta-learning log: ${result.logPath}`);
console.log(`Report: ${outReport}`);

process.exit(result.passes ? 0 : 1);
