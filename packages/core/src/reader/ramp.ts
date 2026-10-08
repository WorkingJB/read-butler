export interface RampSettings {
  enabled: boolean;
  /** Speed at the start of each session. */
  startWpm: number;
  /** Speed the ramp stops at. */
  targetWpm: number;
  /** How much speed is added per step. */
  stepWpm: number;
  /** Words read between steps. */
  stepEveryWords: number;
}

export const DEFAULT_RAMP: RampSettings = {
  enabled: true,
  startWpm: 250,
  targetWpm: 400,
  stepWpm: 25,
  stepEveryWords: 150,
};

/**
 * Speed after `wordsRead` words in the current session. Ramping inside a
 * session warms the reader up instead of dropping them in at full speed.
 */
export function wpmAt(wordsRead: number, ramp: RampSettings): number {
  if (!ramp.enabled || ramp.startWpm >= ramp.targetWpm) return ramp.targetWpm;
  const steps = Math.floor(Math.max(wordsRead, 0) / Math.max(ramp.stepEveryWords, 1));
  return Math.min(ramp.startWpm + steps * ramp.stepWpm, ramp.targetWpm);
}

export interface SessionResult {
  endWpm: number;
  wordsRead: number;
  /** Self-reported comprehension, 1 (lost) to 5 (understood everything). */
  comprehension?: number;
}

/**
 * Suggests the next session's target speed. Progression is slow on purpose:
 * speed only climbs after a real session with good reported comprehension,
 * and it backs off when comprehension drops.
 */
export function suggestNextTarget(current: RampSettings, last: SessionResult): number {
  const MIN_WORDS = 300;
  if (last.wordsRead < MIN_WORDS || last.comprehension === undefined) return current.targetWpm;
  if (last.comprehension >= 4) return Math.min(current.targetWpm + current.stepWpm, 1500);
  if (last.comprehension <= 2) return Math.max(current.targetWpm - current.stepWpm, 100);
  return current.targetWpm;
}
