/**
 * Optimal recognition point: the letter the eye should fix on. Readers
 * recognise a word fastest when they fixate slightly left of its centre, so
 * the reader pins this letter to the same screen position for every word.
 */
export function orpIndex(word: string): number {
  // Skip leading punctuation such as quotes or brackets.
  const lead = word.search(/[\p{L}\p{N}]/u);
  const start = lead === -1 ? 0 : lead;
  const core = word.slice(start).replace(/[^\p{L}\p{N}]+$/u, "");
  const len = core.length;

  let offset: number;
  if (len <= 1) offset = 0;
  else if (len <= 5) offset = 1;
  else if (len <= 9) offset = 2;
  else if (len <= 13) offset = 3;
  else offset = 4;

  return Math.min(start + offset, Math.max(word.length - 1, 0));
}

export function splitAtOrp(word: string): [before: string, pivot: string, after: string] {
  const i = orpIndex(word);
  return [word.slice(0, i), word.charAt(i), word.slice(i + 1)];
}
