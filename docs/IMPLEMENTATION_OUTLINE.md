# Implementation outline — unified cell-sheaf integration

Derived from `docs/plans/2026-10-04-unified-integration-mvp-plan.md` and ideation survivors. Use with `ce-work` per phase.

## Phase 0 — Contract spine (integration boundary)

| Task | Acceptance criteria |
| --- | --- |
| P0-T1: Add `docs/INTEGRATION.md` describing kernel vs surface | Roles, edit order, sync steps documented |
| P0-T2: cell-sheaf CI validates contracts | Workflow runs `validate-sheaf.mjs` from pinned swarm ref; fails on drift |
| P0-T3: Resolve catalog drift policy | Either sync `adp.trunk` to cell-sheaf or document intentional omission |
| P0-T4: Template diff gate | CI fails if `tokens.css` differs from kernel tag without explicit bump |

**Phase exit:** Both repos green on validate at same swarm tag.

## Phase 1 — Headless pulse core

| Task | Acceptance criteria |
| --- | --- |
| P1-T1: Extract `pulse-core.ts` from `store.ts` | No React/zustand imports in core |
| P1-T2: `scripts/pulse-run.mjs` CLI | `--ticks`, `--graph`, `--json` flags; emits event stream |
| P1-T3: Snapshot test for 20 ticks | Event kinds match prior Zustand behavior on fixture graph |
| P1-T4: Refactor `store.ts` to call core | SwarmApp UI unchanged visually |

**Phase exit:** CLI demo in CI artifact log.

## Phase 2 — Federated worker (one backend)

| Task | Acceptance criteria |
| --- | --- |
| P2-T1: Define `WorkerAdapter` interface | TypeScript types in `src/lib/swarm/worker.ts` |
| P2-T2: `LocalShellAdapter` | Runs echo task for dev |
| P2-T3: `GitHubActionsAdapter` | workflow_dispatch with agent/edge inputs |
| P2-T4: Wire adapter into pulse loop | Inflight agent waits for adapter result before done/blocked |
| P2-T5: Map broken `r-op` to blocked path | Worker on ops pillar returns blocked until typed emit exists |

**Phase exit:** One successful ok-path worker completion recorded in events.

## Phase 3 — Evaluation & learning harness

| Task | Acceptance criteria |
| --- | --- |
| P3-T1: Schema extension for `findings[]` | Backward compatible; validate updated |
| P3-T2: Import EVAL.md seats into swarm specimen | Four findings with P0/P1 severities |
| P3-T3: Reviewer agent behavior | Reviewers append seat-stamped finding on eval tick |
| P3-T4: Patch proposal object | `{ edgeId, proposedStatus, rationale }` never auto-writes |
| P3-T5: JEV counter tied to worker ok events | Matches store semantics (cap 128) |

**Phase exit:** Eval view lists findings; JEV increments in CLI run.

## Phase 4 — Operad gate & release

| Task | Acceptance criteria |
| --- | --- |
| P4-T1: `scripts/operad-q0-check.mjs` | Reads operad q0 + JEV; exit 1 if collapse pending |
| P4-T2: Release workflow | Tag only if q0 check + validate pass |
| P4-T3: cell-sheaf sync job | On swarm release, opens PR to mirror contracts/template |

**Phase exit:** Tagged release with both repos aligned.

## Phase 5 — Surface parity

| Task | Acceptance criteria |
| --- | --- |
| P5-T1: Shared test vectors for repair ranking | JSON fixture consumed by TS test + JS test |
| P5-T2: Port verdict UI to `volume.boot.js` | “Look here” sheet matches insight order for specimen |
| P5-T3: README cross-links | Each repo links integration doc |

**Phase exit:** Manual check — same top repair in HTML and React.

## Phase 6 — /agent workspace (optional)

| Task | Acceptance criteria |
| --- | --- |
| P6-T1: `/agent/README.md` | Explains twin repos, not monorepo |
| P6-T2: `manifest.json` pins SHAs | Updated on release |

**Phase exit:** Cloud agent runs can discover layout without cloning guesswork.

---

## Suggested ce-work scopes

| Scope | Phases | Branch suggestion |
| --- | --- | --- |
| **S-small** | Phase 0 only | `cursor/contract-release-bus-50e6` |
| **S-medium** | Phase 0 + 1 | `cursor/pulse-core-cli-50e6` |
| **S-full MVP** | Phases 0–4 | `cursor/federated-loop-mvp-50e6` |

## Blockers

| Blocker | Mitigation |
| --- | --- |
| cell-sheaf has no CI today | Add workflow in cell-sheaf repo (separate PR) |
| `/agent` may not be versioned | Host integration docs in swarm `docs/` |
| Real lattice-ops emit broken | Use as demo; stub typed artifact in worker |
| No npm publish yet for kernel | Use git tag pin until package published |

## Notion

Notion MCP not required; this file is the task source. Optional: import phases as database rows if team uses Notion.
