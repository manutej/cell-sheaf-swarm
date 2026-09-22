# Cell-Sheaf Swarm

Live swarm observatory on a cellular sheaf. Restriction color is glue. Gold is earned.

This repo is the **contract + design kernel** you publish from, then roll into new sheaves without restyling from scratch.

Sister surface: [manutej/cell-sheaf](https://github.com/manutej/cell-sheaf) (volumetric HTML). This repo adds the **swarm clock**, typed operad prompts, and the JSON contract.

## Contract

| file | role |
| --- | --- |
| `contracts/sheaf-graph.schema.json` | SheafGraph 2020-12. Pillars, ρ, commits, agents, operad, findings. |
| `contracts/swarm.sheaf.json` | Current trunk specimen (last-folder + short SHA). |
| `contracts/ROLL.md` | How to mint a new `*.sheaf.json` without breaking glue. |

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
| `src/lib/swarm/types.ts` | Zod enums — GlueStatus, RestrictKind, AgentRole, ViewMode, OcVerdict |
| `src/lib/swarm/specimen.ts` | Same data as `swarm.sheaf.json` |
| `src/lib/swarm/store.ts` | Clock law: idle → launch → residual on ρ → commit or block |
| `src/components/swarm/VolumeCanvas.tsx` | Curvilinear ρ, pillars, in-flight pulses |
| `src/components/swarm/SwarmApp.tsx` | Six modes: Swarm, Commits, Live, Operad, Eval, Subspaces |

OAH (Ormus Agent Harness) is **inspiration**, not a fork. Roles here are local.

## Palette (Sanzo Wada)

Olive Buff paper `#c1c494`, ink `#253122`, ube `#501345`, Cossack Green `#437742`, Cinnamon Buff gold `#fdc57e`, Neutral Gray silver `#b6bfc1`, Burnt Sienna residual `#ae5224`.

## Views

1. **Swarm** — agents as emerald pulses on ρ
2. **Commits** — only green ρ is thick
3. **Live** — in-flight work only
4. **Operad** — compose ≟ collapse, typed SLOT prompts
5. **Eval** — four seats; P0 = a promise the operator cannot perform
6. **Subspaces** — type discs, artifacts drop via lives-at

## Publish

1. Clone this repo.
2. Treat `contracts/swarm.sheaf.json` as the source of truth for any new surface.
3. To ship a **new sheaf**, follow `contracts/ROLL.md` — copy, retarget pillars, keep the schema.
4. GitHub Pages / Vercel: point at the observatory app that loads `*.sheaf.json`.

License: MIT.
