// chrF semplificato: media dell'F2 (recall pesata 2x) sugli n-grammi di caratteri,
// n = 1..6. Gli ordini più lunghi della stringa vengono saltati, così una stringa
// identica vale esattamente 1 anche se corta.

const MAX_N = 6;

function counts(str, n) {
  const s = ` ${str} `;
  const m = new Map();
  for (let i = 0; i + n <= s.length; i++) {
    const g = s.slice(i, i + n);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

function total(m) {
  let t = 0;
  for (const c of m.values()) t += c;
  return t;
}

export function chrf(hyp, ref) {
  const h = String(hyp ?? '');
  const r = String(ref ?? '');
  if (!h && !r) return 1;
  if (!h || !r) return 0;

  let sum = 0;
  let orders = 0;
  for (let n = 1; n <= MAX_N; n++) {
    const a = counts(h, n);
    const b = counts(r, n);
    const na = total(a);
    const nb = total(b);
    if (na === 0 || nb === 0) continue;

    let hit = 0;
    for (const [g, c] of a) {
      const d = b.get(g);
      if (d) hit += Math.min(c, d);
    }
    const p = hit / na;
    const rec = hit / nb;
    const den = 4 * p + rec;
    sum += den === 0 ? 0 : (5 * p * rec) / den;
    orders++;
  }
  return orders === 0 ? 0 : sum / orders;
}
