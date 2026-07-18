# k0nsult-ai-truth-core

The **framework layer** of the K0NSULT open commons: the evidence-first
methodology, the `claim ≤ proof` standard, glossary, knowledge base and
procedures that every other K0NSULT surface (EU shield, country layers) builds on.

> **Doctrine:** `claim ≤ proof`. "100%" means **evidence coverage**, never
> "impenetrability". Only agents are scored — never natural persons.

## Contents (`surfaces/`)
Methodology (PL/EN), `claim-proof-standard`, glossary, knowledge base,
procedures (PL/EN), and the ai-truth index/landing.

## Engine stays hidden
These are surfaces. Any `/api/*` call is the integration boundary; the
k0nsult.cloud engine behind it is proprietary and **not** in this repository.

## Supply chain
`sbom.json` — CycloneDX-lite inventory (SHA-256 per file), via
[`k0nsult-tools`](../k0nsult-tools): `node ../k0nsult-tools/sbom.mjs --root . --out sbom.json`

## License
Apache-2.0 (patent grant, Section 3). See `LICENSE` and `NOTICE`.
