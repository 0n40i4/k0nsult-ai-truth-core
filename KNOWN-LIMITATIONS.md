# KNOWN LIMITATIONS — read before relying on this

**Status: REFERENCE / EXPERIMENTAL.** `schema/validate.mjs` is a reference implementation of the `claim ≤ proof` specification, not a production compliance gate.

This file is published deliberately. Doctrine: **claim ≤ proof** — we document where this is
incomplete rather than overclaiming. The commons underwent internal adversarial review rounds
plus an external review (RSpace); findings and fixes are public in the git history.

## Known open weaknesses
- **The validator checks structure, not truth.** It verifies that a claim carries a `proof_ref`
  and that a referenced file resolves and hashes as declared. It cannot judge whether the claim
  is *substantively* correct — a well-formed lie passes.
- **Path/marker guards are pattern-based.** Path-traversal containment and the `#sha256:` marker
  check are guards against common mistakes, not a hardened security boundary. Do not point it at
  untrusted input as your only defence.
- **Self-tests assert verdicts.** Isolating vectors were added after mutation testing showed
  removing a guard could leave tests green. Coverage is better, not proven exhaustive.
- **`examples/claims-sample.json` is an illustration**, not a catalogue of real claims.

## What IS solid
- `--selftest` runs positive and isolating negative vectors, including path-traversal,
  absolute-path and malformed-hash cases (mutation-verified).
- Zero runtime dependencies; deterministic; offline.

## How to help
Try to break it and open an issue or PR with a reproducing input. That is exactly how the
limitations above were surfaced.
