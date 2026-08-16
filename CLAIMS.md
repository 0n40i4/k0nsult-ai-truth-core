# CLAIMS.md — public claim register (k0nsult-ai-truth-core)

Generated from [`k0nsult-tools/docs/CLAIMS-TEMPLATE.md`](https://github.com/0n40i4/k0nsult-tools/blob/master/docs/CLAIMS-TEMPLATE.md)
(OSS-0-06). Columns mirror
[`schema/evidence-claim.schema.json`](schema/evidence-claim.schema.json) field-for-field.

| id | statement | class | proof_ref / roadmap_ref | repo_status_ref | verified_at |
|---|---|---|---|---|---|
| `clm-0001` | This repo ships a machine-checkable `claim ≤ proof` classifier with a passing `--selftest` suite (18 vectors, positive + isolating negative). | DOWOD | `schema/validate.mjs --selftest` | — | 2026-08-02 |
| `clm-0002` | The validator enforces `additionalProperties:false` parity with `schema/evidence-claim.schema.json` in code, not only in the schema file. | DOWOD | `schema/validate.mjs` `KNOWN_KEYS` set + selftest case "unknown key (typo prof_ref) FAILS" | — | 2026-08-02 |
| `clm-0003` | `--resolve` mode dereferences `file+hash` `proof_ref`s (path containment + SHA-256 match), rejecting path traversal and absolute-path escapes. | DOWOD | `schema/validate.mjs --selftest` cases `--resolve on path-traversal escaping bundle FAILS`, `--resolve on absolute path (inside bundle) FAILS` | — | 2026-08-02 |
| `clm-0004` | `examples/claims-sample.json` is a valid, shape-checked example of the claim register in use. | DOWOD | `node schema/validate.mjs examples/claims-sample.json` → `OK (shape) — 5 claims valid` | — | 2026-08-02 |
| `clm-0005` | A claim may cross-reference a whole repo's `x-k0nsult.status` via the optional `repo_status_ref` field. | DOWOD | `schema/evidence-claim.schema.json` `repo_status_ref` property + `schema/validate.mjs --selftest` cases `repo_status_ref is a known optional field...` | — | 2026-08-02 |
| `clm-0006` | This repo is the **framework layer** every other K0NSULT surface (EU shield, country layers) builds on. | NARRACJA | — (positioning statement, not independently falsifiable from this repo alone) | — | 2026-08-02 |
| `clm-0007` | The k0nsult.cloud engine behind any `/api/*` call referenced from this repo's surfaces is proprietary and not included here. | NARRACJA | — (a negative/scope claim: absence of engine code is structurally true by omission, not something a `--selftest` proves) | — | 2026-08-02 |
| `clm-0008` | A public `index.json` aggregating this repo's `x-k0nsult.status` alongside the other 10 repos will exist. | DOWOD | `../k0nsult-eu-shield/index.json` (OSS-0-10, generated 2026-08-02 — this repo's entry present with `evidenceClass: DOWOD`) | `k0nsult-ai-truth-core#x-k0nsult.status` | 2026-08-02 |
| `clm-0009` | This repo's own `x-k0nsult.status` in `publiccode.yml` reflects the canonical 12-value enum. | GAP | `../k0nsult-eu-shield/generator.config.yml` proposes `CONTROLLED_RESEARCH`, but writing it into `publiccode.yml` is Fala 1 (`OSS-1-01`), `WYMAGA_ACK: TAK` — not yet applied | — | 2026-08-02 |

## Placeholder row (copy for new claims)

| id | statement | class | proof_ref / roadmap_ref | repo_status_ref | verified_at |
|---|---|---|---|---|---|
| `clm-00NN` | *(exact claim text)* | *(DOWOD\|GAP\|NARRACJA)* | *(ref, or "—" if NARRACJA)* | *(optional, or "—")* | *(YYYY-MM-DD)* |

| clm-gap-publiccode | GAP | `publiccode.yml` (x-k0nsult.manifest.hash / sbom.hash) niezgodny z realnym `sbom.json` po regeneracji w tym PR — potwierdzone niezależnie sha256sum (2x) i Get-FileHash. `gen-publiccode.mjs` do przeliczenia nie istnieje w żadnym dostępnym repo. Ten sam wzorzec potwierdzony w 7/7 PR-ów regenerujących SBOM w tej sesji — luka architektoniczna, nie błąd pojedynczego PR-a. | recenzja, 2026-08-16 |
