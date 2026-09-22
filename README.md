# Cell-Sheaf Swarm

Live swarm observatory on a cellular sheaf. Restriction color is glue. Gold is earned.

This repo is the **contract + design kernel** you publish from, then roll into new sheaves without restyling.

Sister surface: [manutej/cell-sheaf](https://github.com/manutej/cell-sheaf) (volumetric HTML). This repo adds the **swarm clock**, typed operad prompts, and the JSON contract.

OAH (Ormus Agent Harness) is **inspiration**, not a fork.

## Roll a new sheaf

1. Copy [`contracts/blank.sheaf.json`](contracts/blank.sheaf.json) → `contracts/<name>.sheaf.json`.
2. Keep `"schema": "sheaf-graph/2020-12"`. Set `id` to `<name>.trunk`.
3. Pillars are **last-folders**. Edges are ρ with `status` ∈ {ok, strange, broken, missing}.
4. `onTrunk` is earned iff some incident ρ is `ok`.
5. Run `node scripts/validate-sheaf.mjs`.
6. Add the file to [`contracts/catalog.json`](contracts/catalog.json).

Law: [`contracts/ROLL.md`](contracts/ROLL.md). Schema: [`contracts/sheaf-graph.schema.json`](contracts/sheaf-graph.schema.json).

Worked example of a roll (not the swarm): [`contracts/paper.sheaf.json`](contracts/paper.sheaf.json).

In the observatory: pick a contract, **Export** the live snapshot, or **Roll** a `*.sheaf.json`.

## Contract

| file | role |
| --- | --- |
| `contracts/sheaf-graph.schema.json` | SheafGraph 2020-12 |
| `contracts/catalog.json` | index of published sheaves |
| `contracts/swarm.sheaf.json` | current trunk specimen |
| `contracts/paper.sheaf.json` | rolled paper stalks |
| `contracts/blank.sheaf.json` | copy template |
| `contracts/ROLL.md` | how to mint a new sheaf without breaking glue |

Glue:

| status | meaning | fold into trunk? |
| --- | --- |
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
| `src/components/swarm/SwarmApp.tsx` | Six modes + contract roll / export |

## Palette (Sanzo Wada)

Olive Buff paper `#c1c494`, ink `#253122`, ube `#501345`, Cossack Green `#437742`, Cinnamon Buff gold `#fdc57e`, Neutral Gray silver `#b6bfc1`, Burnt Sienna residual `#ae5224`.

## Views

1. **Swarm** — agents as emerald pulses on ρ
2. **Commits** — only green ρ is thick
3. **Live** — in-flight work only
4. **Operad** — compose ≟ collapse, typed SLOT prompts
5. **Eval** — four seats; P0 = a promise the operator cannot perform
6. **Subspaces** — type discs, artifacts drop via lives-at

## Validate

```sh
node scripts/validate-sheaf.mjs
```

CI runs the same command on every push (`.github/workflows/sheaf.yml`).

License: MIT.
