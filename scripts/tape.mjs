#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

/**
 * @param {unknown} row
 * @returns {{ ok: true, row: Record<string, unknown> } | { ok: false, error: string }}
 */
export function validateRow(row) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return { ok: false, error: "row must be a plain object" };
  }
  const r = row;
  for (const field of ["key", "command", "event", "at"]) {
    const v = r[field];
    if (typeof v !== "string" || v.length === 0) {
      return { ok: false, error: `${field} must be a non-empty string` };
    }
  }
  if (Number.isNaN(Date.parse(String(r.at)))) {
    return { ok: false, error: "at must be a parseable date string" };
  }
  const payload = r.payload;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "payload must be a plain object" };
  }
  return { ok: true, row: r };
}

function loadExistingKeys(path) {
  const keys = new Set();
  if (!existsSync(path)) return keys;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t);
      if (typeof row.key === "string") keys.add(row.key);
    } catch {
      /* ignore malformed historical lines */
    }
  }
  return keys;
}

/**
 * @param {string} path
 * @param {Record<string, unknown>[]} rows
 */
export function appendRows(path, rows) {
  for (const row of rows) {
    const v = validateRow(row);
    if (!v.ok) throw new Error(v.error);
  }

  const existing = loadExistingKeys(path);
  const seenInBatch = new Set();
  const toWrite = [];
  let skipped = 0;

  for (const row of rows) {
    const key = String(row.key);
    if (existing.has(key) || seenInBatch.has(key)) {
      skipped++;
      continue;
    }
    seenInBatch.add(key);
    toWrite.push(row);
  }

  if (toWrite.length > 0) {
    mkdirSync(dirname(path), { recursive: true });
    const chunk = toWrite.map((r) => JSON.stringify(r)).join("\n") + "\n";
    appendFileSync(path, chunk, "utf8");
  }

  return { appended: toWrite.length, skipped };
}

async function readStdinRows() {
  const rows = [];
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    rows.push(JSON.parse(t));
  }
  return rows;
}

function cmdAppend(tapePath) {
  return readStdinRows().then((rows) => {
    for (const row of rows) {
      const v = validateRow(row);
      if (!v.ok) {
        console.error(`tape append: ${v.error}`);
        process.exit(1);
      }
    }
    const { appended, skipped } = appendRows(tapePath, rows);
    console.log(`appended ${appended}, skipped ${skipped}`);
  });
}

function cmdTail(tapePath, n) {
  if (!existsSync(tapePath)) {
    console.error(`tape tail: missing file ${tapePath}`);
    process.exit(1);
  }
  const lines = readFileSync(tapePath, "utf8").split("\n").filter((l) => l.trim());
  const slice = lines.slice(-n);
  for (const line of slice) {
    const row = JSON.parse(line);
    console.log(`${row.at}  ${row.command}  ${row.event}  ${row.key}`);
  }
}

function parseCli(argv) {
  const args = [...argv];
  const cmd = args.shift();
  if (cmd === "append") {
    let tape = "";
    if (args[0] === "--tape") tape = args[1] ?? "";
    if (!tape) {
      console.error("usage: tape.mjs append --tape <path>  (NDJSON on stdin)");
      process.exit(2);
    }
    return { cmd: "append", tape };
  }
  if (cmd === "tail") {
    let tape = "";
    let n = 20;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--tape") tape = args[++i] ?? "";
      else if (args[i] === "-n") n = Number(args[++i] ?? 20);
    }
    if (!tape) {
      console.error("usage: tape.mjs tail --tape <path> [-n 20]");
      process.exit(2);
    }
    return { cmd: "tail", tape, n };
  }
  console.error("usage: tape.mjs append|tail ...");
  process.exit(2);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const parsed = parseCli(process.argv.slice(2));
  if (parsed.cmd === "append") {
    cmdAppend(parsed.tape).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    cmdTail(parsed.tape, parsed.n);
  }
}
