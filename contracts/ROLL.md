# Rolling a new sheaf contract

A contract is one JSON file that validates against `sheaf-graph.schema.json`.
Do not fork the visual language. Copy the schema, swap the stalks.

## 1. Copy the template

```sh
cp contracts/swarm.sheaf.json contracts/<name>.sheaf.json
```

Set `id` to `<name>.trunk`. Keep `"schema": "sheaf-graph/2020-12"`.

## 2. Replace pillars

Each pillar is a **last-folder**, never a full path.

| field | rule |
| --- | --- |
| `kind` | `core` / `lib` / `app` / `mem` |
| `known` | `true` if it already has a section (boundary B) |
| `dim` | stalk dimension; drives pillar height |
| `x`,`z` | layout only |

## 3. Write restriction maps

Every edge is ρ, not a "link".

| `status` | color | commit rule |
| --- | --- | --- |
| `ok` | green | legal trunk |
| `strange` | orange | needs a person |
| `broken` | red | do not fold |
| `missing` | gray dashed | no map written |

`kind` ∈ {identity, projection, embed, spectral, type-aware}.
`residual` is ‖δ‖. `residualMeaning` is the sentence a reviewer can quote.

## 4. Commits

`onTrunk` is **earned**: true only if every ρ the commit walks is `ok`.
Short SHA. Message is one clause.

## 5. Operad (optional, for swarm)

Each node has a typed `prompt`:

```
SLOT[<id>] sort=<Sort> · inputs=<…> · rule=compose(parts) ≡ collapse(whole) · refuse if …
```

OC is `agree` iff the compose answer equals the collapse answer.

## 6. Check

- No two pillars share `id`.
- Every `restriction.source` / `.target` is a pillar id.
- Every `commit.pillar` is a pillar id.
- Every `artifact.maps` is a pillar id; `artifact.type` is a type-disc id.
- Gold never appears on a `broken` or `missing` ρ.

Drop the new file next to `swarm.sheaf.json`. The observatory reads any
`*.sheaf.json` that passes the schema.
