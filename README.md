# Cell-Sheaf Swarm

Live swarm observatory on a cellular sheaf. Restriction color is glue. Gold is earned.

This repo is the **contract + design kernel** you publish from, then roll into new sheaves without restyling from scratch.

The **HTML design template** is the visual law: [`template/`](template/) (`index.html`, `tokens.css`, `volume.paint.js`, `volume.boot.js`). JSON is the sheaf. Do not fork the chrome.

Sister surface: [manutej/cell-sheaf](https://github.com/manutej/cell-sheaf). OAH is **inspiration**, not a fork.

## Roll a new sheaf

1. Copy [`template/`](template/) if you need a new volume — do not restyle `tokens.css`.
2. Copy [`contracts/blank.sheaf.json`](contracts/blank.sheaf.json) → `contracts/<name>.sheaf.json`.
3. Keep `"schema": "sheaf-graph/2020-12"`. Set `id` to `<name>.trunk`.
4. Pillars are **last-folders**. Edges are ρ with `status` ∈ {ok, strange, broken, missing}.
5. `onTrunk` is earned iff some incident ρ is `ok`.
6. Run `node scripts/validate-sheaf.mjs`.
7. Add the file to [`contracts/catalog.json`](contracts/catalog.json).

Law: [`contracts/ROLL.md`](contracts/ROLL.md). Schema: [`contracts/sheaf-graph.schema.json`](contracts/sheaf-graph.schema.json).

Worked example of a roll (not the swarm): [`contracts/paper.sheaf.json`](contracts/paper.sheaf.json).

In the observatory: pick a contract, **Export**, **Roll** a file, or open **Design** for the HTML volume (six design views: pillars / ρ / strata / harmonic / trunk / subspaces).

Enable GitHub Pages from `main` / root — `index.html` is this same template over `contracts/`.

## Contract

| file | role |
| --- | --- |
| `template/` | HTML design template — copy this chrome, swap the sheaf |
| `index.html` | GitHub Pages entry (same template, loads `contracts/`) |
| `contracts/sheaf-graph.schema.json` | SheafGraph 2020-12 |
| `contracts/catalog.json` | index of published sheaves |
| `contracts/swarm.sheaf.json` | current trunk specimen |
| `contracts/paper.sheaf.json` | rolled paper stalks |
| `contracts/blank.sheaf.json` | copy template |
| `contracts/ROLL.md` | how to mint a new sheaf without breaking glue |

Glue:

| status | meaning | fold into trunk? |
| --- | --- | --- |
| `ok` | compose = collapse | yes |
| `strange` | map exists, rank/sort odd | only after a person |
| `broken` | coboundary will not vanish | no |
| `missing` | no ρ written | no |

## Design kernel (TypeScript)

| file | role |
| --- | --- |
| `src/lib/swarm/types.ts` | Zod enums — GlueStatus, RestrictKind, AgentRole, ViewMode, SheafGraph |
| `src/lib/swarm/load-sheaf.ts` | parse + ROLL checks |
| `src/lib/swarm/specimen.ts` | catalog: JSON is the source of truth |
| `src/lib/swarm/store.ts` | Clock law: idle → launch → residual on ρ → commit or block |
| `src/components/swarm/VolumeCanvas.tsx` | Curvilinear ρ, pillars, in-flight pulses |
| `src/components/swarm/SwarmApp.tsx` | Six swarm modes + contract roll / export |

## Palette (Sanzo Wada)

Olive Buff paper `#c1c494`, ink `#253122`, ube `#501345`, Cossack Green `#437742`, Cinnamon Buff gold `#fdc57e`, Neutral Gray silver `#b6bfc1`, Burnt Sienna residual `#ae5224`.

## Views

HTML template: **Exists, Restricts, Stacks, Known, May fold, Lives**. The title is the one map that opens a closed folder. See [`contracts/EVAL.md`](contracts/EVAL.md).

Swarm observatory: **Swarm, Commits, Live, Operad, Eval, Subspaces**.

## Validate

```sh
node scripts/validate-sheaf.mjs
```

CI runs the same command on every push (`.github/workflows/sheaf.yml`).

## Integration

Twin repo **cell-sheaf** (HTML template / Pages) and this kernel stay aligned via contract sync — [`docs/INTEGRATION.md`](docs/INTEGRATION.md), MVP plan [`docs/plans/2026-10-04-unified-integration-mvp-plan.md`](docs/plans/2026-10-04-unified-integration-mvp-plan.md), tasks [`docs/IMPLEMENTATION_OUTLINE.md`](docs/IMPLEMENTATION_OUTLINE.md).

## Federated running loop (prototype)

Run from **this repo root** (`cell-sheaf-swarm`). There is no `package.json` at `/agent` alone — in Cloud Agent workspaces use `cd repos/cell-sheaf-swarm` or `npm run … --prefix path/to/cell-sheaf-swarm`.

```sh
npm test
npm run pulse:run -- --graph contracts/swarm.sheaf.json --ticks 20 --adapter local
npm run federation:run
```

Three cell loops + four-seat eval + meta-learning log (see INTEGRATION.md). Full worker-adapter federation is phased in the outline.

## Observatory (React dev shell)

```sh
npm run observatory:dev
```

Vite app in `observatory/` loads `SwarmApp.tsx`. Product direction: [`STRATEGY.md`](STRATEGY.md) and [`docs/UNIFIED_STRATEGY_DRAFT.md`](docs/UNIFIED_STRATEGY_DRAFT.md).

License: MIT.
