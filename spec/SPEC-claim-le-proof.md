# SPEC — `claim ≤ proof` (evidence-first classification)

**Version:** 1.0 · **License:** Apache-2.0 · **Status:** reference specification (clean-room).

A machine-checkable rule for public claims: **no claim may exceed its proof.** Every
statement an organisation publishes is classified into exactly one of three classes,
and the class determines what evidence must accompany it.

## The three classes

| Class | Meaning | Required evidence | Example |
|---|---|---|---|
| **DOWÓD** (PROOF) | Verifiable *now* by a third party | a resolvable `proof_ref` (URL, file+hash, commit, test) that anyone can re-run/inspect | "SBOM has 84 components, each SHA-256-pinned — see `sbom.json`" |
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

## Hard rules (enforced by `schema/evidence-claim.schema.json`)
1. A `DOWÓD` **must** carry a non-empty `proof_ref`. (No proof → downgrade to GAP.)
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
