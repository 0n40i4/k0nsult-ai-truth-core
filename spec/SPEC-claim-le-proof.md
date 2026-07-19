# SPEC — `claim ≤ proof` (evidence-first classification)

**Version:** 1.0 · **License:** Apache-2.0 · **Status:** reference specification (clean-room).

A machine-checkable rule for public claims: **no claim may exceed its proof.** Every
statement an organisation publishes is classified into exactly one of three classes,
and the class determines what evidence must accompany it.

## The three classes

| Class | Meaning | Required evidence | Example |
|---|---|---|---|
| **DOWÓD** (PROOF) | Verifiable *now* by a third party | a resolvable `proof_ref` (URL, file+hash, commit, test) that anyone can re-run/inspect | "SBOM has 17 components, each SHA-256-pinned — see `sbom.json`" |
| **GAP** | True intention, not yet realised — honest roadmap | a `roadmap_ref` (issue/plan) and an explicit target; **must not be phrased as done** | "Public repos are prepared locally; publication pending operator sign-off" |
| **NARRACJA** (FRAMING) | Interpretation, opinion, positioning | none required, but **must be labelled** so it is not read as proof | "This model is the pattern the EU strategy calls for" |

> Doctrine note: "100%" means **evidence coverage**, never "impenetrability". A percentage
> is a DOWÓD only if the denominator and method are stated (own-ruler percentages are NARRACJA).

## Decision tree (classifier)

```
Is the statement independently verifiable RIGHT NOW?
├─ yes → does a resolvable proof_ref exist?
│        ├─ yes → DOWÓD
│        └─ no  → GAP  (verifiable in principle, but no artefact yet — DO NOT call it DOWÓD)
└─ no  → is it a factual intention with a target/plan?
         ├─ yes → GAP        (roadmap_ref required, phrased as future)
         └─ no  → NARRACJA   (must be explicitly labelled)
```

## What the validator enforces (two modes)
The reference validator `schema/validate.mjs` runs in two modes, and the SPEC deliberately does
**not** overstate what the default does:

- **default (shape check)** — enforces structure: a `DOWÓD` carries a non-empty `proof_ref`, a `GAP`
  carries a `roadmap_ref` and future phrasing, unknown fields are rejected (parity with the schema's
  `additionalProperties: false`). It does **not** dereference the `proof_ref` — a syntactically valid
  but dangling reference passes shape check.
- **`--resolve`** — additionally **dereferences** `proof_ref`s written as `file+hash`
  (`<path>#sha256:<64hex>`): the file must exist under the claims file's directory **and** its SHA-256
  must match, otherwise the claim FAILS. This is the mode that makes "resolvable" enforced rather than
  narrated. References that are not `file+hash` (URL, commit, test id) are out of scope for the
  built-in resolver and are left to the reader to re-run.

## Hard rules (enforced by `schema/evidence-claim.schema.json`)
1. A `DOWÓD` **must** carry a non-empty `proof_ref` (shape check). Under `--resolve` a `file+hash`
   `proof_ref` must additionally dereference (file present, hash matches). (No proof → downgrade to GAP.)
2. A `NARRACJA` **must not** be presented as verified fact — it carries `class: "NARRACJA"`.
3. A `GAP` **must** be phrased as future/roadmap and carry a `roadmap_ref`.
4. Reclassification is one-directional under scrutiny: an unproven `DOWÓD` becomes a `GAP`,
   never the reverse without new evidence.

## Why this matters for the EU (COM(2026)503)
Public procurement and OSMI eligibility should reward **re-derivable** evidence (a hash a
third party can recompute), not self-declared PDFs or vanity metrics. `claim ≤ proof` is
the discipline that makes "verifiable open source" testable rather than narrated.

## Governance
Irreversible acts (publication, external submission, signing) are **human-gated** — the
classifier counts and labels; it never authorises the act. Signing needs an operator key
(No Password Custody: no key is generated or stored by tooling).
