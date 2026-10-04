---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan
execution: code
date: 2026-10-04
topic: unified-cell-sheaf-integration-mvp
---

# Unified integration MVP plan

## Goal Capsule

**Objective:** Ship a **10× clearer MVP path** than “merge the repos”: federated running loops driven by the existing sheaf contract, with evaluation/learning harness and enforced integration boundaries between **cell-sheaf-swarm** (kernel) and **cell-sheaf** (HTML surface).

**Means:** Contract release bus → headless pulse runner → one real worker backend → eval findings in JSON → operad q0 gate on promote.

**Authority:** `contracts/sheaf-graph.schema.json`, `contracts/ROLL.md`, `src/lib/swarm/store.ts` clock law, `src/lib/swarm/insight.ts` repair ranking.

**Stop conditions:** Stop if glue law would be violated (auto-ok on strange/broken); stop if template tokens.css would be restyled for integration.

## Product Contract

### Requirements

| ID | Requirement | Acceptance example |
| --- | --- | --- |
| R1 | Swarm remains **contract authority** | All catalog/schema changes land in cell-sheaf-swarm first |
| R2 | cell-sheaf **tracks** kernel releases | Tagged sync copies `contracts/` + `template/`; validate passes |
| R3 | **Headless pulse** runs without React | CLI advances tick, emits same event kinds as `pulse()` |
| R4 | **Federated worker** executes at least one agent task externally | e.g. GH Action triggered with `edgeId`, returns pass/fail |
| R5 | **Eval harness** records seat findings | `findings[]` populated; JEV counter moves on worker/reviewer roles |
| R6 | **Insight parity** for verdict | CLI + HTML agree on top repair for `swarm.sheaf.json` |
| R7 | **Integration map** documents /agent workspace | README explains twin-repo layout, not a third package |

### Actors

- Sheaf author, Operator (loop runner), Evaluator (seats), CI (validate + operad gate).

### Out of scope (MVP)

- Full lattice-ops productization (fix ρ first as demo).
- Live multi-tenant WebSocket federation.
- Notion task sync (optional later).

## Planning Contract

### Key technical decisions

| KTD | Decision | Rationale |
| --- | --- | --- |
| KTD-1 | Extract pulse engine from Zustand | Reuse proven clock law; keep React as viewer |
| KTD-2 | Worker adapter interface `{ role, edgeId, task } → Result` | Pluggable local vs CI vs cloud agent |
| KTD-3 | cell-sheaf imports validate via pinned swarm version | Avoid duplicating schema |
| KTD-4 | Findings schema extension in sheaf-graph | Keeps JSON as source of truth |
| KTD-5 | /agent stays non-publish orchestration docs | Parent workspace pattern |

### Architecture (concise)

```
┌──────────────────── cell-sheaf-swarm (kernel) ────────────────────┐
│ contracts/*.sheaf.json  validate-sheaf.mjs  insight.ts  pulse-core │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ tag sync                       │ worker API
                ▼                                ▼
┌──────────────────── cell-sheaf (surface) ────  federated runner ────┐
│ template/*  Pages index.html                  GH Action / agent hook │
└────────────────────────────────────────────────────────────────────┘
                ▲
                │ manifest + plans
         /agent workspace (optional)
```

**Federated loop:** `pulse-core` selects idle agents → assigns ρ on pillar → dispatches worker → on completion sets agent done/blocked → kernel/fixer roles emit commits only when ρ is ok → eval tick emits JEV/seat summary.

**Eval harness:** Reviewer roles read `findings[]` + EVAL rubric; new findings propose edge status changes as **draft patches** (not auto-applied). Human or operad q0 CI promotes patches.

### Assumptions

- GitHub Actions available for first backend.
- Both repos stay public MIT.
- Broken `r-op` remains demo blocker until orchestrator emits typed artifact.

### Sequencing

1. Contract bus (R1,R2) — unblocks everything.
2. pulse-core extract (R3).
3. Single worker adapter (R4).
4. Findings + JEV (R5).
5. Insight parity tests (R6).
6. /agent README in workspace (R7) — can land in swarm docs if /agent is not versioned.

## Implementation Units

### U1. Contract release bus

- Add cell-sheaf CI workflow calling swarm validate script (pinned ref).
- Document sync procedure in `docs/INTEGRATION.md`.
- Align catalogs (adp entry or explicit exclusion policy).

**DoD:** PR to cell-sheaf fails if contracts invalid vs swarm schema.

### U2. pulse-core package

- New module `src/lib/swarm/pulse-core.ts` — pure functions from `store.ts` pulse body.
- CLI `scripts/pulse-run.mjs` — stdin/stdout JSON events.

**DoD:** 100 ticks on `swarm.sheaf.json` reproduces event kinds in snapshot test.

### U3. Worker adapter (GitHub Actions)

- Workflow dispatch input: agent id, edgeId, task.
- Runner reports `{ status: ok|blocked, reason }` to pulse CLI via artifact or callback file.

**DoD:** One planner or worker agent completes one inflight cycle via CI.

### U4. Eval findings schema

- Extend schema (backward compatible) for `findings[]` with seat, severity, claim.
- Seed from EVAL.md table for swarm specimen.
- Validate script checks finding shape.

**DoD:** validate passes; eval mode displays findings in SwarmApp (read-only MVP).

### U5. Operad q0 CI sketch

- Script evaluates operad q0 fields + JEV threshold stub.
- Blocks release tag if `oc !== agree`.

**DoD:** Documented gate; runs on manual workflow_dispatch for MVP.

### U6. Insight parity

- Export repair ranking tests shared by TS and (bundled or ported) boot JS.

**DoD:** Same top repair id for specimen in both runtimes.

## Verification Contract

```sh
cd cell-sheaf-swarm
node scripts/validate-sheaf.mjs
node --test scripts/validate-sheaf.test.mjs
# after U2:
node scripts/pulse-run.mjs --graph contracts/swarm.sheaf.json --ticks 20 --json
```

cell-sheaf (after U1):

```sh
# CI equivalent — validate with pinned swarm script
```

## Definition of Done

**Global MVP done when:**

- Sister repos synchronized at a tagged release and both validate green.
- Headless pulse runs ≥20 ticks with ≥1 CI-dispatched agent completion.
- Eval findings visible in contract + one eval event per 14 ticks in log.
- Top repair verdict matches between insight.ts and HTML/CLI.
- `docs/UNIFIED_STRATEGY_DRAFT.md` and this plan linked from README.

## Appendix

### Repo comparison snapshot (2026-10-04)

| Dimension | cell-sheaf | cell-sheaf-swarm |
| --- | --- | --- |
| Role | HTML template + Pages | Kernel + observatory |
| TS/React | No | Yes (`src/lib/swarm`, components) |
| CI validate | No | Yes (`sheaf.yml`) |
| Schema / ROLL | Missing | Present |
| Extra contracts | `data/trunk-sheaf.json` | `adp.sheaf.json` |
| Catalog | 3 entries | 4 entries |
| Loop simulation | JS boot only (visual) | Zustand `pulse()` |

### /agent workspace

Not a git monorepo — container for two clones only. Integration thesis: add manifest + docs here or in swarm `docs/` pointing to both remotes.

### Walkthrough at MVP (future)

Screen recording would show: (1) broken ρ on lattice-ops, (2) pulse launches worker via CI, (3) eval finding added, (4) human flips patch, (5) gold/trunk state updates in observatory + HTML.
