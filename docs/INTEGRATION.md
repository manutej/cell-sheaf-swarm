# Integration — cell-sheaf + cell-sheaf-swarm

## Roles

| Repo | Role | Change here first |
| --- | --- | --- |
| [cell-sheaf-swarm](https://github.com/manutej/cell-sheaf-swarm) | Contract schema, validation, TS kernel, React observatory, swarm clock | Contracts, schema, pulse logic, CI |
| [cell-sheaf](https://github.com/manutej/cell-sheaf) | HTML design template (`template/`), GitHub Pages entry | Never restyle `tokens.css`; swap sheaf JSON; mirror kernel on release |

## Side-by-side (quick diff)

| Dimension | cell-sheaf | cell-sheaf-swarm |
| --- | --- | --- |
| Runtime | Static Pages (`volume.boot.js`) | Pages + `observatory/` Vite shell for `SwarmApp` |
| Contracts | Pages catalog subset | Full catalog + `adp`, schema, ROLL |
| Simulation | Pause-default HTML clock | Zustand `pulse()` + prototype **federated CLI** (`scripts/federated-harness.mjs`) |
| Extra | `data/trunk-sheaf.json` (legacy) | `notebook.html`, operad/JEV in swarm specimen |

Overlap: **`template/`**, glue four-status law, gold = earned `onTrunk`, pillars = last-folders. Kernel is canonical for schema and validate.

## Workspace `/agent`

The `/agent` directory in Cloud Agent environments holds **two sibling clones** under `repos/`. It is not a monorepo — no shared root `package.json`. Use it to run cross-repo plans.

- **Kernel docs** (this repo): `docs/INTEGRATION.md`, plans, ideation.
- **Surface docs** (cell-sheaf): `docs/README.md` hub, `SWARM_KERNEL_PIN.json`, contract-release CI — see branch `cursor/contract-release-bus-50e6`.

## Sync procedure (target state)

1. Merge contract changes in **cell-sheaf-swarm**; `node scripts/validate-sheaf.mjs` green.
2. Tag release `vX.Y.Z`.
3. Open PR in **cell-sheaf** copying `contracts/` and `template/` from that tag (or automated sync when Phase 4 lands).
4. Bump surface `SWARM_KERNEL_PIN.json` to that tag/commit; surface CI validates and checks byte parity (see cell-sheaf `check-kernel-sync.mjs`).

Catalog drift policy: see cell-sheaf `docs/CATALOG_DRIFT.md` (e.g. `adp.trunk` kernel-only until mirrored).

## Federated loop

**Target (MVP plan):** Extract `pulse-core` from `store.ts`, worker adapters, eval findings on sheaf JSON — see `docs/plans/2026-10-04-unified-integration-mvp-plan.md` and `docs/IMPLEMENTATION_OUTLINE.md`.

**Prototype today:** Three federated cells tick in parallel; coordinator runs four-seat eval (`contracts/EVAL.md`) and meta-learning weights on blocks.

```sh
npm run federation:run
# .meta-learning/federation.jsonl · last-report.json
```

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ cell-core   │  │ cell-apps   │  │ cell-mem    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       └────────────────┼────────────────┘
                        ▼
              evalSeats (×4) · metaLearn
```

Next engineering step per outline: **Phase 1** headless `pulse-core` + `pulse-run.mjs` CLI (replace duplicated logic in federated harness).

## Related artifacts

| Artifact | Path |
| --- | --- |
| Ideation (research) | `docs/ideation/2026-10-04-unified-cell-sheaf-integration-ideation.html` |
| Ideation (agent run) | `docs/ideation/2026-10-04-cell-sheaf-unification-ideation.html` |
| Strategy draft | `docs/UNIFIED_STRATEGY_DRAFT.md` |
| Strategy (house format) | `STRATEGY.md` |
| MVP plan | `docs/plans/2026-10-04-unified-integration-mvp-plan.md` |
| Implementation outline | `docs/IMPLEMENTATION_OUTLINE.md` |
| Observatory plan (superseded by MVP plan) | `docs/plans/2026-10-04-unified-observatory-unified-plan.md` |
