#!/usr/bin/env node
// validate.mjs — validator for the claim<=proof evidence-claim contract. Zero deps (Node >=18).
// Implements the hard rules of SPEC-claim-le-proof.md directly (no JSON-Schema engine needed):
//   - DOWOD    requires a non-empty proof_ref
//   - GAP      requires a non-empty roadmap_ref AND phrased_as_future === true
//   - NARRACJA requires class label only
// Usage:
//   node validate.mjs --selftest              # run the negative/positive test suite
//   node validate.mjs claims.json             # validate an array (or single) of claims
import { readFileSync } from 'node:fs';

const CLASSES = ['DOWOD', 'GAP', 'NARRACJA'];

export function validateClaim(c) {
  const errors = [];
  if (!c || typeof c !== 'object') return { ok: false, errors: ['not an object'] };
  if (!c.id) errors.push('missing id');
  if (!c.statement) errors.push('missing statement');
  if (!CLASSES.includes(c.class)) errors.push(`class must be one of ${CLASSES.join('|')}`);
  if (c.class === 'DOWOD' && !c.proof_ref) errors.push('DOWOD requires proof_ref (else downgrade to GAP)');
  if (c.class === 'GAP') {
    if (!c.roadmap_ref) errors.push('GAP requires roadmap_ref');
    if (c.phrased_as_future !== true) errors.push('GAP must be phrased_as_future:true (not stated as done)');
  }
  return { ok: errors.length === 0, errors };
}

function selftest() {
  const cases = [
    // [label, claim, expectOk]
    ['DOWOD with proof passes', { id: '1', statement: 'SBOM has 84 components', class: 'DOWOD', proof_ref: 'sbom.json#sha256' }, true],
    ['DOWOD without proof FAILS', { id: '2', statement: 'we are 100% secure', class: 'DOWOD' }, false],
    ['NARRACJA as DOWOD is caught by labelling', { id: '3', statement: 'best model in EU', class: 'NARRACJA' }, true],
    ['GAP phrased as future passes', { id: '4', statement: 'repos will be published', class: 'GAP', roadmap_ref: 'issue#1', phrased_as_future: true }, true],
    ['GAP stated as done FAILS', { id: '5', statement: 'repos are published', class: 'GAP', roadmap_ref: 'issue#1', phrased_as_future: false }, false],
    ['GAP without roadmap FAILS', { id: '6', statement: 'will do X', class: 'GAP', phrased_as_future: true }, false],
    ['unknown class FAILS', { id: '7', statement: 'x', class: 'HYPE' }, false],
  ];
  let pass = 0;
  for (const [label, claim, expectOk] of cases) {
    const { ok } = validateClaim(claim);
    const good = ok === expectOk;
    console.log(`${good ? 'PASS' : 'FAIL'}  ${label}`);
    if (good) pass++;
  }
  console.log(`\n${pass}/${cases.length} tests passed`);
  process.exit(pass === cases.length ? 0 : 1);
}

const arg = process.argv[2];
if (arg === '--selftest' || !arg) {
  selftest();
} else {
  const data = JSON.parse(readFileSync(arg, 'utf8'));
  const claims = Array.isArray(data) ? data : [data];
  let bad = 0;
  claims.forEach((c, i) => {
    const { ok, errors } = validateClaim(c);
    if (!ok) { bad++; console.log(`[${i}] ${c.id || '?'} INVALID: ${errors.join('; ')}`); }
  });
  console.log(bad === 0 ? `OK — ${claims.length} claims valid` : `${bad}/${claims.length} INVALID`);
  process.exit(bad === 0 ? 0 : 1);
}
