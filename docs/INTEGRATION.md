# Integration — cell-sheaf + cell-sheaf-swarm

## Roles

| Repo | Role | Change here first |
| --- | --- | --- |
| [cell-sheaf-swarm](https://github.com/manutej/cell-sheaf-swarm) | Contract schema, validation, TS kernel, React observatory, swarm clock | Contracts, schema, pulse logic, CI |
| [cell-sheaf](https://github.com/manutej/cell-sheaf) | HTML design template (`template/`), GitHub Pages entry | Never restyle `tokens.css`; swap sheaf JSON |

## Workspace `/agent`

The `/agent` directory in Cloud Agent environments holds **two sibling clones** under `repos/`. It is not a monorepo — no shared root `package.json`. Use it to run cross-repo plans; publish integration docs from this kernel repo.

## Sync procedure (target state)

1. Merge contract changes in **cell-sheaf-swarm**; `node scripts/validate-sheaf.mjs` green.
2. Tag release `vX.Y.Z`.
3. Open PR in **cell-sheaf** copying `contracts/` and `template/` from that tag (or run automated sync job).
4. Run the same validate script in cell-sheaf CI against pinned tag.

## Federated loop (MVP direction)

See `docs/plans/2026-10-04-unified-integration-mvp-plan.md`. Pulse clock law lives in `src/lib/swarm/store.ts` (to become `pulse-core` + CLI). Workers map to agent roles on restriction edges; eval findings live on the sheaf JSON.

## Related artifacts

- Ideation: `docs/ideation/2026-10-04-unified-cell-sheaf-integration-ideation.html`
- Strategy draft: `docs/UNIFIED_STRATEGY_DRAFT.md`
- Implementation outline: `docs/IMPLEMENTATION_OUTLINE.md`
