#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
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
import { readFileSync, existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve as pathResolve, isAbsolute, relative } from 'node:path';

const CLASSES = ['DOWOD', 'GAP', 'NARRACJA'];
const KNOWN_KEYS = new Set(['id', 'statement', 'class', 'proof_ref', 'roadmap_ref', 'phrased_as_future']);
// file+hash proof_ref form: <path>#sha256:<64 hex>
const FILE_HASH_RE = /^(.+)#sha256:([0-9a-fA-F]{64})$/;
// H6: any sha256 marker at all — if present but NOT a valid 64-hex file+hash, the ref is
// malformed and must FAIL (never silently pass as "not a file+hash ref").
const SHA_MARKER_RE = /#sha256:/i;

function sha256File(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

// Dereference a DOWOD file+hash proof_ref against baseDir. Returns error string or null.
export function resolveProofRef(proofRef, baseDir) {
  const ref = proofRef || '';
  const m = FILE_HASH_RE.exec(ref);
  if (!m) {
    // H6: a sha256 marker that is NOT a valid 64-hex file+hash is malformed => FAIL.
    if (SHA_MARKER_RE.test(ref)) return `proof_ref has a malformed sha256 hash (must be 64 hex): ${ref}`;
    return null; // genuinely not a file+hash ref (URL/commit/test id) — nothing to dereference
  }
  const [, rel, wantHex] = m;
  // H5: containment — the proof file must live INSIDE the claims file's directory.
  // Reject absolute paths and any traversal that escapes baseDir (no arbitrary host reads).
  if (isAbsolute(rel)) return `proof_ref must be repo-relative, not absolute (${rel})`;
  const base = pathResolve(baseDir || '.');
  const abs = pathResolve(base, rel);
  const inside = relative(base, abs);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    return `proof_ref escapes the bundle directory (${rel})`;
  }
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

  // Isolating fixtures for the H5 containment guards (so mutation-testing actually kills a case,
  // rather than a backstop silently saving it). A REAL file lives INSIDE a bundle subdir, and the
  // pre-existing realAbs lives OUTSIDE it (one level up, in tmp). Both share `body` => `realHash`.
  const bundleDir = pathResolve(tmp, `k0nsult-bundle-${process.pid}`);
  mkdirSync(bundleDir, { recursive: true });
  const insideName = 'inside-proof.txt';
  const insideAbs = pathResolve(bundleDir, insideName);
  writeFileSync(insideAbs, body);
  // Absolute path that resolves INSIDE the bundle: isolates the isAbsolute guard alone.
  //   guard present -> FAIL (rejected as absolute); guard removed -> resolves & matches -> PASS.
  const absInsideRef = `${insideAbs}#sha256:${realHash}`;
  // Relative traversal that escapes the bundle to a REAL matching file: isolates the containment guard.
  //   guard present -> FAIL (escapes bundle); guard removed -> resolves to realAbs & matches -> PASS.
  const traversalRealRef = `../${realName}#sha256:${realHash}`;

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
    // H5 ISOLATING vectors — each points at a REAL matching file so exactly one guard stands
    // between FAIL and PASS. Comment out that guard and the case flips to PASS (mutation-killed),
    // proving the guard is load-bearing rather than coverage-theatre.
    //  - absolute-inside: only the isAbsolute guard (line 47) rejects it; removed => resolves inside => PASS.
    ['--resolve on absolute path (inside bundle) FAILS', { id: '12', statement: 'proof_ref given as absolute path', class: 'DOWOD', proof_ref: absInsideRef }, false, { resolve: true, baseDir: bundleDir }],
    //  - traversal-real: only the containment guard (lines 51-53) rejects it; removed => resolves to the
    //    real out-of-bundle file whose hash matches => PASS (arbitrary host read).
    ['--resolve on path-traversal escaping bundle FAILS', { id: '13', statement: 'proof_ref escapes the bundle dir', class: 'DOWOD', proof_ref: traversalRealRef }, false, { resolve: true, baseDir: bundleDir }],
    // Defense-in-depth (literal hostile inputs) — real-world traversal / absolute host paths must FAIL too.
    ['--resolve on ../../../etc/hostname FAILS', { id: '14', statement: 'reads outside the bundle', class: 'DOWOD', proof_ref: `../../../etc/hostname#sha256:${wrongHash}` }, false, { resolve: true, baseDir: bundleDir }],
    ['--resolve on /etc/passwd FAILS', { id: '15', statement: 'reads an absolute host path', class: 'DOWOD', proof_ref: `/etc/passwd#sha256:${wrongHash}` }, false, { resolve: true, baseDir: bundleDir }],
    // H6 ISOLATING vector — a `#sha256:` marker with a non-64-hex hash is malformed and must FAIL.
    // Remove the SHA_MARKER_RE guard (line 41) and this flips to PASS (ref silently skipped as
    // "not a file+hash"), proving that guard is load-bearing too.
    ['--resolve on malformed sha marker FAILS', { id: '16', statement: 'proof hash is malformed', class: 'DOWOD', proof_ref: 'sbom.json#sha256:deadbeef' }, false, { resolve: true, baseDir: bundleDir }],
  ];
  let pass = 0;
  for (const [label, claim, expectOk, opts] of cases) {
    const { ok } = validateClaim(claim, opts || {});
    const good = ok === expectOk;
    console.log(`${good ? 'PASS' : 'FAIL'}  ${label}`);
    if (good) pass++;
  }
  try { unlinkSync(realAbs); } catch { /* best effort cleanup */ }
  try { rmSync(bundleDir, { recursive: true, force: true }); } catch { /* best effort cleanup */ }
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
