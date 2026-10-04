---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan
execution: code
topic: unified-observatory
date: 2026-10-04
---

# Unified Cell-Sheaf Observatory — Implementation Plan

## Goal Capsule

**Objective:** Merge cell-sheaf (publish template) and cell-sheaf-swarm (kernel + swarm TS) into one product loop: validate contract → federated agent ticks → four-seat eval → meta-learned repair ranking → human-readable observatory.

**Means:** Keep two Git remotes short-term; single source of truth in cell-sheaf-swarm with sync docs and npm-boundary; ship runnable federation CLI and Vite observatory on this branch.

**Authority:** `STRATEGY.md`, `contracts/ROLL.md`, `contracts/EVAL.md` over ad-hoc UI tweaks.

**Stop:** When CI validates all catalog specimens, federation run emits report, observatory dev server renders SwarmApp over swarm specimen.

## Product Contract

### Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| R1 | Repo integration map documented | `docs/INTEGRATION.md` compares both repos |
| R2 | Federated running loop | 3 cells, N rounds, shared eval + meta-learning log |
| R3 | Eval harness | Four seats aligned with EVAL.md fire on federation snapshot |
| R4 | Strategy for downstream CE skills | Root `STRATEGY.md` in house format |
| R5 | Observatory dev shell | Vite app resolves `@/` to `src/`, loads SwarmApp |
| R6 | CI unchanged | `sheaf:validate` + node tests green |

### Out of scope (MVP)

- npm publish `@cell-sheaf/kernel`
- Automated template sync to cell-sheaf on tag
- Live OpenAI agent wiring to real repos
- Fixing `r-op` broken ρ in specimen (human decision)

## Planning Contract

### KTD-1: Federation is simulation-first

Prove loop + eval + meta-learning in Node before binding external agents. Basis: `store.ts` pulse already encodes clock law.

### KTD-2: HTML template remains zero-build

Pages entry stays vanilla JS; React observatory is optional dev/pro tier.

### KTD-3: Insight single source

Long-term: extract `insight.ts` to shared package consumed by `volume.boot.js` build step — deferred post-MVP.

## Implementation Units

| U-ID | Unit | Status |
| --- | --- | --- |
| U1 | `docs/INTEGRATION.md` | done |
| U2 | `scripts/federated-harness.mjs` + CLI + tests | done |
| U3 | `STRATEGY.md` | done |
| U4 | `observatory/` Vite shell | done |
| U5 | README federation + observatory commands | this PR |
| U6 | cell-sheaf README pointer to kernel (optional follow-up PR on sibling repo) | deferred |

## Verification Contract

```sh
cd /agent/repos/cell-sheaf-swarm
npm test
npm run sheaf:validate
npm run federation:run
cd observatory && npm install && npm run build
```

## Definition of Done

- All verification commands exit 0 (federation may exit 1 until specimen operad passes — document expected failure mode).
- Ideation artifact stored at `docs/ideation/2026-10-04-cell-sheaf-unification-ideation.html`.
- PR opened from `cursor/unified-federated-loop-aeac`.

## Appendix

Spec-to-implementation mapping (Notion optional): treat this plan as the implementation page; tasks = U-IDs above. Link spec: `docs/INTEGRATION.md` + user query 2026-10-04.
