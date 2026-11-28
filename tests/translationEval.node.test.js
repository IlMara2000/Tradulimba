import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chrf } from './eval/chrf.js';
import { checkInvariants } from './eval/assertions.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(here, 'eval', name), 'utf8'));
const cases = load('translationCases.json');
const thresholds = load('thresholds.json');
const reviewed = cases.filter((c) => c.status === 'reviewed');

test('chrF: testo identico vale 1', () => {
  assert.equal(chrf('bonas dies', 'bonas dies'), 1);
});

test('chrF: testi estranei restano bassi', () => {
  assert.ok(chrf('bonas dies', 'xyz qrt') < 0.3);
});

test('chrF: ipotesi vuota vale 0', () => {
  assert.equal(chrf('', 'bonas dies'), 0);
});

test('invarianti: la reference passa su se stessa per ogni caso', () => {
  for (const c of reviewed) {
    const failures = checkInvariants({ ...c, output: c.reference });
    assert.deepEqual(failures, [], `${c.id}: ${failures.join(', ')}`);
  }
});

test('invarianti: output vuoto segnalato', () => {
  const failures = checkInvariants({ ...reviewed[0], output: '   ' });
  assert.ok(failures.includes('output-empty'), failures.join(', '));
});

test('invarianti: termine vietato segnalato', () => {
  const c = reviewed.find((x) => x.mustNotContain.length > 0);
  const failures = checkInvariants({ ...c, output: `${c.reference} ${c.mustNotContain[0]}` });
  assert.ok(failures.some((f) => f.startsWith('forbidden-term')), failures.join(', '));
});

test('invarianti: paragrafi persi segnalati', () => {
  const c = reviewed.find((x) => x.text.includes('\n\n'));
  const failures = checkInvariants({ ...c, output: c.reference.replace(/\n\s*\n/g, ' ') });
  assert.ok(failures.some((f) => f.startsWith('paragraph-count')), failures.join(', '));
});

test('casi: struttura valida e copertura soglie', () => {
  assert.ok(reviewed.length >= 8, `reviewed: ${reviewed.length}`);
  for (const c of reviewed) {
    for (const field of ['id', 'source', 'target', 'text', 'reference']) {
      assert.ok(c[field], `${c.id ?? '?'}: campo ${field} mancante`);
    }
    assert.ok(Array.isArray(c.mustContain), `${c.id}: mustContain non è un array`);
    assert.ok(Array.isArray(c.mustNotContain), `${c.id}: mustNotContain non è un array`);
    const pair = `${c.source}->${c.target}`;
    assert.ok(pair in thresholds, `soglia mancante per ${pair}`);
  }
});

// Rete e gateway: spento per default, si attiva con TRANSLATION_EVAL_LIVE=1.
test('live: qualità traduzioni', { skip: process.env.TRANSLATION_EVAL_LIVE !== '1' }, async () => {
  const { translateText } = await import('../api/_translator.js');
  for (const c of reviewed) {
    const { translation: out } = await translateText({
      text: c.text,
      source: c.source,
      target: c.target,
    });
    const failures = checkInvariants({ ...c, output: out });
    assert.deepEqual(failures, [], `${c.id}: ${failures.join(', ')}`);
    const score = chrf(out, c.reference);
    assert.ok(
      score >= thresholds[`${c.source}->${c.target}`].chrf,
      `${c.id}: chrF ${score.toFixed(3)}`,
    );
  }
});
