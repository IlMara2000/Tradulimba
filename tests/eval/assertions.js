// Assertion deterministiche su una traduzione: pure function, nessun I/O.
// Restituisce la lista dei problemi; lista vuota = invarianti rispettati.

const NUMBER = /\d[\d.,:/-]*/g;

const paragraphs = (s) => s.split(/\n\s*\n/).length;
const startsUpper = (s) => /^[A-ZÀÈÉÌÒÙ]/.test(s.trim());
const endsSentence = (s) => /[.!?…]$/.test(s.trim());

export function checkInvariants({ text, output, reference, mustContain = [], mustNotContain = [] }) {
  const t = String(text ?? '');
  const o = String(output ?? '');
  const r = String(reference ?? '');
  const failures = [];

  if (!o.trim()) {
    failures.push('output-empty');
  } else {
    if (o.trim() === t.trim()) failures.push('output-identical-to-input');
    if (paragraphs(o) !== paragraphs(t)) {
      failures.push(`paragraph-count: ${paragraphs(o)} vs ${paragraphs(t)}`);
    }
  }

  for (const term of mustContain) if (!o.includes(term)) failures.push(`missing-term: ${term}`);
  for (const term of mustNotContain) if (o.includes(term)) failures.push(`forbidden-term: ${term}`);

  for (const n of new Set(r.match(NUMBER) ?? [])) {
    if (!o.includes(n)) failures.push(`missing-number: ${n}`);
  }

  if (/\{\{|\}\}/.test(o)) failures.push('template-residue');

  if (o.trim() && r.trim()) {
    if (startsUpper(r) !== startsUpper(o)) failures.push('capitalization-mismatch');
    if (endsSentence(r) !== endsSentence(o)) failures.push('final-punctuation-mismatch');
    const ratio = o.length / r.length;
    if (ratio < 0.5 || ratio > 2) failures.push(`length-ratio: ${ratio.toFixed(2)}`);
  }

  return failures;
}
