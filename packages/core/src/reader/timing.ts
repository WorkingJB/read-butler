import type { Token } from "./tokenize";

export interface TimingOptions {
  /** Extra time on words ending a sentence, as a multiple of the base delay. */
  sentencePause: number;
  /** Extra time on words ending with a comma, colon or semicolon. */
  clausePause: number;
  /** Extra time on the last word of a paragraph. */
  paragraphPause: number;
  /** Words longer than this get proportionally more time. */
  longWordThreshold: number;
}

export const DEFAULT_TIMING: TimingOptions = {
  sentencePause: 1.0,
  clausePause: 0.5,
  paragraphPause: 1.5,
  longWordThreshold: 8,
};

export function baseDelayMs(wpm: number): number {
  return 60_000 / wpm;
}

/** How long a token stays on screen at the given speed. */
export function delayMs(token: Token, wpm: number, opts: TimingOptions = DEFAULT_TIMING): number {
  const base = baseDelayMs(wpm);
  let multiplier = 1;

  const word = token.text.replace(/["'’”)\]]+$/u, "");
  if (/[.!?…]$/u.test(word)) multiplier += opts.sentencePause;
  else if (/[,;:\u2014]$/u.test(word)) multiplier += opts.clausePause;

  if (token.paragraphEnd) multiplier = Math.max(multiplier, 1 + opts.paragraphPause);

  const extra = token.text.length - opts.longWordThreshold;
  if (extra > 0) multiplier += Math.min(extra * 0.05, 0.5);

  return base * multiplier;
}

/** Estimated time left from `fromIndex` to the end, at a fixed speed. */
export function remainingMs(tokens: Token[], fromIndex: number, wpm: number, opts?: TimingOptions): number {
  let total = 0;
  for (let i = fromIndex; i < tokens.length; i++) total += delayMs(tokens[i], wpm, opts);
  return total;
}
