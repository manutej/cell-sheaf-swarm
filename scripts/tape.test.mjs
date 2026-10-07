import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { appendRows, validateRow } from "./tape.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const graph = join(ROOT, "contracts", "swarm.sheaf.json");
const TAPE_CLI = join(ROOT, "scripts", "tape.mjs");
const PULSE_CLI = join(ROOT, "scripts", "pulse-run-cli.ts");

function runPulseJson(ticks, seed = "1") {
  return spawnSync("npx", ["--yes", "tsx", PULSE_CLI, "--graph", graph, "--ticks", String(ticks), "--json"], {
    cwd: ROOT,
    env: { ...process.env, SHEAF_PULSE_SEED: seed },
    encoding: "utf8",
  });
}

function runPulseTape(ticks, tapePath, seed = "1") {
  return spawnSync(
    "npx",
    ["--yes", "tsx", PULSE_CLI, "--graph", graph, "--ticks", String(ticks), "--tape", tapePath],
    {
      cwd: ROOT,
      env: { ...process.env, SHEAF_PULSE_SEED: seed },
      encoding: "utf8",
    },
  );
}

function parseTapeLines(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

test("validateRow rejects empty key", () => {
  const v = validateRow({ key: "", command: "c", event: "e", payload: {}, at: "2020-01-01T00:00:00.000Z" });
  assert.equal(v.ok, false);
});

test("append rejects bad batch atomically", () => {
  const dir = mkdtempSync(join(tmpdir(), "tape-"));
  const path = join(dir, "t.jsonl");
  const good = {
    key: "k1",
    command: "pulse",
    event: "roll",
    payload: {},
    at: "2020-01-01T00:00:00.000Z",
  };
  const bad = { ...good, key: "" };
  assert.throws(() => appendRows(path, [good, bad]), /key/);
  assert.throws(() => readFileSync(path), (e) => e.code === "ENOENT");
  rmSync(dir, { recursive: true });
});

test("append dedupes by key", () => {
  const dir = mkdtempSync(join(tmpdir(), "tape-"));
  const path = join(dir, "t.jsonl");
  const row = {
    key: "a",
    command: "pulse",
    event: "x",
    payload: {},
    at: "2020-01-01T00:00:00.000Z",
  };
  assert.deepEqual(appendRows(path, [row]), { appended: 1, skipped: 0 });
  assert.deepEqual(appendRows(path, [row]), { appended: 0, skipped: 1 });
  rmSync(dir, { recursive: true });
});

test("tail prints last N rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "tape-"));
  const path = join(dir, "t.jsonl");
  appendRows(path, [
    { key: "1", command: "pulse", event: "a", payload: {}, at: "2020-01-01T00:00:00.000Z" },
    { key: "2", command: "pulse", event: "b", payload: {}, at: "2020-01-02T00:00:00.000Z" },
  ]);
  const r = spawnSync("node", [TAPE_CLI, "tail", "--tape", path, "-n", "1"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /pulse  b  2/);
  rmSync(dir, { recursive: true });
});

test("seeded pulse json line counts grow past 48-event cap", () => {
  const r40 = runPulseJson(40);
  const r60 = runPulseJson(60);
  const r80 = runPulseJson(80);
  assert.equal(r40.status, 0, r40.stderr);
  assert.equal(r60.status, 0, r60.stderr);
  assert.equal(r80.status, 0, r80.stderr);
  const lines40 = r40.stdout.trim().split("\n").filter(Boolean);
  const lines60 = r60.stdout.trim().split("\n").filter(Boolean);
  const lines80 = r80.stdout.trim().split("\n").filter(Boolean);
  assert.ok(lines40.length < lines60.length && lines60.length < lines80.length);
  assert.ok(lines60.length > 48, `expected >48 events at 60 ticks, got ${lines60.length}`);
  assert.deepEqual(lines40, lines80.slice(0, lines40.length));
  assert.deepEqual(lines60, lines80.slice(0, lines60.length));
});

test("60-tick seeded tape is idempotent with unique swarm event ids", () => {
  const dir = mkdtempSync(join(tmpdir(), "tape-"));
  const path = join(dir, "swarm.jsonl");
  assert.equal(runPulseTape(60, path).status, 0);
  const first = parseTapeLines(path);
  assert.equal(runPulseTape(60, path).status, 0);
  const second = parseTapeLines(path);
  assert.equal(first.length, second.length);
  assert.ok(first.length > 48);
  for (const row of first) {
    assert.equal(row.command, "pulse");
    assert.equal(typeof row.key, "string");
    assert.equal(typeof row.payload.id, "string");
    assert.match(row.at, /^2023-11-14T/);
  }
  const ids = first.map((r) => r.payload.id);
  assert.equal(new Set(ids).size, ids.length);
  const r = spawnSync("node", [TAPE_CLI, "tail", "--tape", path, "-n", "5"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim().split("\n").length, 5);
  rmSync(dir, { recursive: true });
});

test("tape append CLI rejects invalid stdin batch", () => {
  const dir = mkdtempSync(join(tmpdir(), "tape-"));
  const path = join(dir, "t.jsonl");
  const good = JSON.stringify({
    key: "ok",
    command: "pulse",
    event: "x",
    payload: {},
    at: "2020-01-01T00:00:00.000Z",
  });
  const bad = JSON.stringify({ key: "", command: "c", event: "e", payload: {}, at: "2020-01-01T00:00:00.000Z" });
  const r = spawnSync("node", [TAPE_CLI, "append", "--tape", path], {
    input: `${good}\n${bad}\n`,
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  try {
    readFileSync(path);
    assert.fail("should not write");
  } catch (e) {
    assert.equal(e.code, "ENOENT");
  }
  rmSync(dir, { recursive: true });
});
