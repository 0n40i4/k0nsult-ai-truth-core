#!/usr/bin/env node
// validate.mjs — validator for the claim<=proof evidence-claim contract. Zero deps (Node >=18).
// Implements the hard rules of SPEC-claim-le-proof.md directly (no JSON-Schema engine needed):
//   - DOWOD    requires a non-empty proof_ref
//   - GAP      requires a non-empty roadmap_ref AND phrased_as_future === true
//   - NARRACJA requires class label only
// Two modes, matching what the SPEC promises:
//   - default        : SHAPE check (structure + non-empty proof_ref). Does NOT dereference.
//   - --resolve      : additionally DEREFERENCES file+hash proof_refs of DOWOD claims
//                      (`<path>#sha256:<64hex>`): the file must exist AND its SHA-256 must match,
//                      else FAIL. This is what makes "resolvable" true rather than narrated.
// Parity with schema/evidence-claim.schema.json (additionalProperties:false): any key outside the
// known set is rejected — a typo'd `prof_ref` no longer sneaks past unchecked.
// Usage:
//   node validate.mjs --selftest              # run the negative/positive test suite
//   node validate.mjs claims.json             # SHAPE-validate an array (or single) of claims
//   node validate.mjs --resolve claims.json   # SHAPE + dereference file+hash proofs (base = file's dir)
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve as pathResolve, isAbsolute } from 'node:path';

const CLASSES = ['DOWOD', 'GAP', 'NARRACJA'];
const KNOWN_KEYS = new Set(['id', 'statement', 'class', 'proof_ref', 'roadmap_ref', 'phrased_as_future']);
// file+hash proof_ref form: <path>#sha256:<64 hex>
const FILE_HASH_RE = /^(.+)#sha256:([0-9a-fA-F]{64})$/;

function sha256File(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

// Dereference a DOWOD file+hash proof_ref against baseDir. Returns error string or null.
export function resolveProofRef(proofRef, baseDir) {
  const m = FILE_HASH_RE.exec(proofRef || '');
  if (!m) return null; // not a file+hash ref (URL/commit/test id) — nothing to dereference here
  const [, rel, wantHex] = m;
  const abs = isAbsolute(rel) ? rel : pathResolve(baseDir || '.', rel);
  if (!existsSync(abs)) return `proof_ref does not resolve: file not found (${rel})`;
  const gotHex = sha256File(abs).toLowerCase();
  if (gotHex !== wantHex.toLowerCase()) {
    return `proof_ref hash mismatch for ${rel}: expected ${wantHex.toLowerCase()}, got ${gotHex}`;
  }
  return null;
}

export function validateClaim(c, opts = {}) {
  const errors = [];
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { ok: false, errors: ['not an object'] };
  // Parity with additionalProperties:false — reject unknown keys (blocks typo'd `prof_ref` smuggling).
  for (const k of Object.keys(c)) {
    if (!KNOWN_KEYS.has(k)) errors.push(`unknown field: ${k}`);
  }
  if (!c.id) errors.push('missing id');
  if (!c.statement) errors.push('missing statement');
  if (!CLASSES.includes(c.class)) errors.push(`class must be one of ${CLASSES.join('|')}`);
  if (c.class === 'DOWOD') {
    if (!c.proof_ref) {
      errors.push('DOWOD requires proof_ref (else downgrade to GAP)');
    } else if (opts.resolve) {
      const rErr = resolveProofRef(c.proof_ref, opts.baseDir);
      if (rErr) errors.push(rErr);
    }
  }
  if (c.class === 'GAP') {
    if (!c.roadmap_ref) errors.push('GAP requires roadmap_ref');
    if (c.phrased_as_future !== true) errors.push('GAP must be phrased_as_future:true (not stated as done)');
  }
  return { ok: errors.length === 0, errors };
}

function selftest() {
  // Fixtures for --resolve tests: a real file with a known SHA-256, plus a dead reference.
  const tmp = process.env.TMPDIR || process.env.TEMP || process.env.TMP || '.';
  const realName = `k0nsult-proof-${process.pid}.txt`;
  const realAbs = pathResolve(tmp, realName);
  const body = 'evidence-claim resolve fixture\n';
  writeFileSync(realAbs, body);
  const realHash = createHash('sha256').update(body).digest('hex');
  const goodRef = `${realName}#sha256:${realHash}`;
  const wrongHash = '0'.repeat(64);
  const tamperedRef = `${realName}#sha256:${wrongHash}`;
  const deadRef = `does-not-exist-${process.pid}.txt#sha256:${realHash}`;

  const cases = [
    // [label, claim, expectOk, opts]
    ['DOWOD with proof passes', { id: '1', statement: 'SBOM has 17 components', class: 'DOWOD', proof_ref: 'sbom.json#sha256' }, true],
    ['DOWOD without proof FAILS', { id: '2', statement: 'we are 100% secure', class: 'DOWOD' }, false],
    ['NARRACJA as DOWOD is caught by labelling', { id: '3', statement: 'best model in EU', class: 'NARRACJA' }, true],
    ['GAP phrased as future passes', { id: '4', statement: 'repos will be published', class: 'GAP', roadmap_ref: 'issue#1', phrased_as_future: true }, true],
    ['GAP stated as done FAILS', { id: '5', statement: 'repos are published', class: 'GAP', roadmap_ref: 'issue#1', phrased_as_future: false }, false],
    ['GAP without roadmap FAILS', { id: '6', statement: 'will do X', class: 'GAP', phrased_as_future: true }, false],
    ['unknown class FAILS', { id: '7', statement: 'x', class: 'HYPE' }, false],
    // F16 — the judge's exploit: a NARRACJA smuggling a proof-looking typo'd key USED TO PASS.
    // With additionalProperties parity it now FAILS on the unknown field.
    ['unknown key (typo prof_ref) FAILS', { id: '8', statement: 'framing that looks proven', class: 'NARRACJA', prof_ref: 'sbom.json#sha256:deadbeef' }, false],
    // F8 — the judge's exploit: a DOWOD whose file+hash proof_ref points at a NON-EXISTENT file
    // passed the old shape-only check ("resolvable" was narrated, not enforced). With --resolve it FAILS.
    ['--resolve on dead file+hash FAILS', { id: '9', statement: 'proof file exists', class: 'DOWOD', proof_ref: deadRef }, false, { resolve: true, baseDir: tmp }],
    ['--resolve on tampered hash FAILS', { id: '10', statement: 'proof hash matches', class: 'DOWOD', proof_ref: tamperedRef }, false, { resolve: true, baseDir: tmp }],
    // Positive: a real file whose SHA-256 matches resolves under --resolve.
    ['--resolve on real file+hash PASSES', { id: '11', statement: 'proof file resolves', class: 'DOWOD', proof_ref: goodRef }, true, { resolve: true, baseDir: tmp }],
  ];
  let pass = 0;
  for (const [label, claim, expectOk, opts] of cases) {
    const { ok } = validateClaim(claim, opts || {});
    const good = ok === expectOk;
    console.log(`${good ? 'PASS' : 'FAIL'}  ${label}`);
    if (good) pass++;
  }
  try { unlinkSync(realAbs); } catch { /* best effort cleanup */ }
  console.log(`\n${pass}/${cases.length} tests passed`);
  process.exit(pass === cases.length ? 0 : 1);
}

const args = process.argv.slice(2);
const wantResolve = args.includes('--resolve');
const positional = args.filter((a) => !a.startsWith('--'));

if (args.includes('--selftest') || positional.length === 0) {
  selftest();
} else {
  const file = positional[0];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const claims = Array.isArray(data) ? data : [data];
  const baseDir = dirname(pathResolve(file));
  let bad = 0;
  claims.forEach((c, i) => {
    const { ok, errors } = validateClaim(c, { resolve: wantResolve, baseDir });
    if (!ok) { bad++; console.log(`[${i}] ${c.id || '?'} INVALID: ${errors.join('; ')}`); }
  });
  const mode = wantResolve ? 'resolve' : 'shape';
  console.log(bad === 0 ? `OK (${mode}) — ${claims.length} claims valid` : `${bad}/${claims.length} INVALID (${mode})`);
  process.exit(bad === 0 ? 0 : 1);
}
