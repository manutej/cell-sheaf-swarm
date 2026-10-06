import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validateFile } from "./validate-sheaf.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "operad-q0-check.mjs");
const FIX = join(ROOT, "scripts", "fixtures");
const BLANK = join(ROOT, "contracts", "blank.sheaf.json");

function run(args, { cwd = ROOT } = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
}

for (const name of ["q0-pending.sheaf.json", "q0-diverge.sheaf.json", "q0-agreed.sheaf.json"]) {
  test(`fixture ${name} validates`, () => {
    const { issues } = validateFile(join(FIX, name));
    assert.equal(issues.length, 0, issues.join("; "));
  });
}

test("blank contract → pending exit 1", () => {
  const r = run([BLANK]);
  assert.equal(r.status, 1, r.stderr);
  assert.equal(r.stdout.trim(), "blank.trunk: q0 pending (compose=pending, collapse=pending, oc=pending)");
});

test("pending fixture → exit 1", () => {
  const r = run([join(FIX, "q0-pending.sheaf.json")]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /q0 pending/);
});

test("diverge fixture → exit 1", () => {
  const r = run([join(FIX, "q0-diverge.sheaf.json")]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout.trim(), "fixture.q0-diverge: q0 diverged");
});

test("agreed fixture → exit 0", () => {
  const r = run([join(FIX, "q0-agreed.sheaf.json")]);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), "fixture.q0-agreed: q0 agreed");
});

test("agreed + insufficient JEV → exit 1", () => {
  const state = join(FIX, "jev-state-10.json");
  const r = run([join(FIX, "q0-agreed.sheaf.json"), "--state", state, "--jev", "128"]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout.trim(), "fixture.q0-agreed: q0 pending jev 10/128");
});

test("agreed + sufficient JEV → exit 0", () => {
  const state = join(FIX, "jev-state-128.json");
  const r = run([join(FIX, "q0-agreed.sheaf.json"), "--state", state, "--jev", "128"]);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), "fixture.q0-agreed: q0 agreed");
});

test("non-numeric --jev → exit 2", () => {
  const state = join(FIX, "jev-state-128.json");
  const r = run([join(FIX, "q0-agreed.sheaf.json"), "--state", state, "--jev", "abc"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage:/);
});

test("missing file → exit 2", () => {
  const r = run([join(FIX, "no-such.sheaf.json")]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /q0 error/);
});
