# cell-sheaf ↔ cell-sheaf-swarm integration map

Two public repos that share one **visual law** (HTML template + Wada tokens) and one **data law** (SheafGraph `2020-12` JSON). They differ in **audience**, **runtime depth**, and **publish surface**.

## Side-by-side

| Dimension | [cell-sheaf](https://github.com/manutej/cell-sheaf) | [cell-sheaf-swarm](https://github.com/manutej/cell-sheaf-swarm) |
| --- | --- | --- |
| Primary job | Copy-paste **design template** for new volumes | **Kernel**: schema, ROLL law, TS swarm logic, CI |
| Runtime | Static GitHub Pages (`template/volume.boot.js`) | Pages template **plus** React observatory sources (not wired until `observatory/`) |
| Contracts | Subset (`swarm`, `paper`, `blank`, catalog) | Full catalog + `adp`, `ROLL.md`, JSON Schema, validate script |
| TypeScript | None | `src/lib/swarm/*`, `src/components/swarm/*` |
| Simulation | Pause-default HTML clock | Zustand `pulse()` + **federated harness** (`scripts/federated-harness.mjs`) |
| Extra data | `data/trunk-sheaf.json` (legacy stalk shape) | `notebook.html` (discipline plate, not the lattice) |
| Insight / eval | `contracts/EVAL.md` adversarial read | Same EVAL + `insight.ts` repairs/verdict + operad/JEV in contract |

## Overlap (keep one source of truth)

1. **`template/`** — Nearly identical; swarm is canonical (schema docs, CI). Sync script: copy swarm → sheaf on release tags.
2. **`contracts/*.sheaf.json`** — Swarm owns schema validation; sheaf ships a **read-only mirror** of published specimens for Pages demos.
3. **Glue semantics** — `ok | strange | broken | missing`, gold = earned `onTrunk`, pillars = last-folders.

## Gaps (integration work)

| Gap | Unified target |
| --- | --- |
| React observatory has no dev app | `observatory/` Vite shell loads `SwarmApp` |
| HTML template vs TS insight diverge | Shared repair ranking: port `insight.ts` tests to boot or bundle a thin JS build |
| Two repos drift on `tokens.css` | Single release artifact: npm package `@cell-sheaf/kernel` exporting contracts + validate + harness |
| `lattice-ops` ρ is **broken** in specimen | MVP closes loop: federation run → report → human fixes contract → re-validate |
| No meta-learning persistence | `.meta-learning/federation.jsonl` + `last-report.json` from harness |

## Recommended unified scope

**One product:** *Cell-Sheaf Observatory* — read any sheaf contract, see where work is blocked, run federated agent loops, export rolls.

- **Publish layer:** cell-sheaf (or merged repo `template/` + Pages) for zero-install readers.
- **Kernel layer:** cell-sheaf-swarm (contracts, validate, TS, federation CLI).
- **MVP loop:** validate → federated run → eval seats → meta-learn weights → observatory UI shows verdict.

## Federation architecture (implemented)

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ cell-core   │  │ cell-apps   │  │ cell-mem    │
│ pulse tick  │  │ pulse tick  │  │ pulse tick  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
              ┌──────────────────┐
              │ Coordinator      │
              │ evalSeats (×4)   │
              │ metaLearn weights│
              └──────────────────┘
```

Run: `npm run federation:run` (default `contracts/swarm.sheaf.json`, 48 rounds).
