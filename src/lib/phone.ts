const KG_RANGES: [number, number][] = [
  [220, 229],
  [500, 509],
  [550, 559],
  [560, 569],
  [700, 709],
  [770, 779],
  [990, 999],
];

function startsWithKgOperator(digits: string): boolean {
  if (digits.length < 3) return false;
  const prefix = parseInt(digits.slice(0, 3), 10);
  return KG_RANGES.some(([lo, hi]) => prefix >= lo && prefix <= hi);
}

export function normalizePhone(raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  if (v.startsWith("+")) return v;           // already international — leave as-is
  if (v.startsWith("0")) return "+996" + v.slice(1);  // 0XXX → +996XXX
  if (v.startsWith("996")) return "+" + v;             // 996XXX → +996XXX
  if (startsWithKgOperator(v)) return "+996" + v;      // 558... → +996558...
  return v;                                              // unknown format — leave as-is
}
