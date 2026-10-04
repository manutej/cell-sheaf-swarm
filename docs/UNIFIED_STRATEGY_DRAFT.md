# Unified product strategy (DRAFT)

> **Status:** Draft — not authoritative. Does not replace per-repo README intent. Merge into root `STRATEGY.md` after user interview (`ce-strategy` Phase 1).

## Purpose

Build an **integrated cellular-sheaf product** where JSON contracts describe multi-repo systems, restriction glue shows what can fold to trunk, and a **federated running loop** orchestrates agents across pillars with an **evaluation and learning harness** that earns gold (`onTrunk`) instead of decorating it.

## Positioning

- **For:** Operators and builders running multi-agent / multi-repo work who need a single map of “what may fold” and “what to fix first.”
- **Category:** Contract-first observatory + orchestration kernel — not a generic dashboard, not a math demo.
- **Against:** Issue trackers and CI alone (they do not encode ρ glue or operad compose/collapse).
- **Sister repos (unchanged intent):**
  - **cell-sheaf-swarm** — kernel: schema, validation, TS/React observatory, swarm clock.
  - **cell-sheaf** — HTML template + Pages: visual law people copy when rolling a sheaf.

## Users

| Persona | Job | Success signal |
| --- | --- | --- |
| **Sheaf author** | Roll a new contract from `blank.sheaf.json` | Validates; catalog entry; readable verdict in UI |
| **Operator** | Run federated loops without losing glue law | Agents block on broken/strange ρ; commits only on ok |
| **Evaluator** | Run four-seat reads (EVAL) | Findings attach to contract; JEV progresses measurably |
| **Template copier** | Fork Pages volume only | Never restyles `tokens.css`; swaps JSON only |

## Key metrics (where they live)

| Metric | Meaning | Source (future) |
| --- | --- | --- |
| **Trunk closure** | All pillars have ≥1 legal incident ρ | Derived from sheaf + insight repair |
| **JEV progress** | Eval battery toward 128 | `store.ts` / headless runner counter |
| **Glue health** | Count of ok vs hurt ρ | Header + validate script |
| **Compose ≟ collapse** | Operad q0 OC state | operad fields + CI gate |
| **Contract drift** | Diff between sister repos | Release-bus CI job |

## Tracks (integrated product)

1. **Contract spine (now):** Single authority in swarm; sync + validate in cell-sheaf; no catalog drift.
2. **Federated loop MVP:** Headless pulse runner with one real backend (e.g. GitHub Action per role) wired to `orchestrator` and `multi-agent-eval` pillars.
3. **Eval harness v0:** Structured `findings[]` from EVAL seats; reviewer agents produce patch proposals; human promotes strange→ok.
4. **Surface parity:** Shared repair/verdict logic in React + HTML boot; six HTML question-tabs + six swarm modes remain distinct but aligned.
5. **Workspace layer:** `/agent` manifest documenting pinned repos and integration plans (optional, non-publish).

## Boundaries

- Do not restyle `template/tokens.css`.
- Do not auto-approve `strange` restrictions without human.
- Strategy does not schedule sprints — use plans/issues for execution.
- cell-sheaf stays publishable without Node build when possible.

## Milestones (draft)

| Milestone | Outcome |
| --- | --- |
| M0 | Sister repos synced; validate CI on both |
| M1 | Headless pulse CLI + event log |
| M2 | One federated worker path + eval findings in JSON |
| M3 | Operad q0 gate on release tag |

## Brand

**Cell-Sheaf** (integrated); volumes keep Sanzo Wada palette; “restriction color is glue.”
