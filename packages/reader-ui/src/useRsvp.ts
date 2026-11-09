"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { delayMs, wpmAt, type RampSettings, type TimingOptions, type Token, MAX_WPM, MIN_WPM } from "@readbutler/core";

export interface SessionSummary {
  /** Client-generated id, so repeated checkpoints upsert one row. */
  id: string;
  startedAt: Date;
  startIndex: number;
  endIndex: number;
  wordsRead: number;
  activeMs: number;
  startWpm: number;
  endWpm: number;
}

export interface Checkpoint {
  index: number;
  wpm: number;
  finished: boolean;
  session: SessionSummary;
}

export interface UseRsvpOptions {
  tokens: Token[];
  initialIndex?: number;
  ramp: RampSettings;
  timing?: TimingOptions;
  /** Called on pause, finish, tab hide, unmount and every `checkpointEveryMs` while playing. */
  onCheckpoint?: (c: Checkpoint) => void;
  checkpointEveryMs?: number;
}

const clampWpm = (w: number) => Math.min(Math.max(Math.round(w), MIN_WPM), MAX_WPM);

export function useRsvp({
  tokens,
  initialIndex = 0,
  ramp,
  timing,
  onCheckpoint,
  checkpointEveryMs = 10_000,
}: UseRsvpOptions) {
  const startIndex = Math.min(Math.max(initialIndex, 0), Math.max(tokens.length - 1, 0));
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(false);
  const [manualWpm, setManualWpm] = useState<number | null>(null);
  const [wordsRead, setWordsRead] = useState(0);

  const wpm = manualWpm ?? wpmAt(wordsRead, ramp);

  // Refs mirror state for the timer loop, which must not re-subscribe on every word.
  const indexRef = useRef(startIndex);
  const wpmRef = useRef(wpm);
  const wordsReadRef = useRef(0);
  const playingSinceRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextAtRef = useRef(0);
  const session = useRef<SessionSummary>({
    id: newId(),
    startedAt: new Date(),
    startIndex,
    endIndex: startIndex,
    wordsRead: 0,
    activeMs: 0,
    startWpm: clampWpm(wpm),
    endWpm: clampWpm(wpm),
  });
  const onCheckpointRef = useRef(onCheckpoint);

  useEffect(() => {
    wpmRef.current = wpm;
    onCheckpointRef.current = onCheckpoint;
  });

  const snapshot = useCallback((finished = false): Checkpoint => {
    const s = session.current;
    const now = performance.now();
    const activeMs = s.activeMs + (playingSinceRef.current === null ? 0 : now - playingSinceRef.current);
    return {
      index: indexRef.current,
      wpm: clampWpm(wpmRef.current),
      finished,
      session: { ...s, activeMs: Math.round(activeMs), endIndex: indexRef.current, endWpm: clampWpm(wpmRef.current) },
    };
  }, []);

  const emit = useCallback((finished = false) => onCheckpointRef.current?.(snapshot(finished)), [snapshot]);

  const stopTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const pause = useCallback(() => {
    stopTimer();
    if (playingSinceRef.current !== null) {
      session.current.activeMs += performance.now() - playingSinceRef.current;
      playingSinceRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (tokens.length === 0 || timerRef.current !== null) return;
    if (indexRef.current >= tokens.length - 1) {
      indexRef.current = 0;
      setIndex(0);
    }

    const step = () => {
      const next = indexRef.current + 1;
      if (next >= tokens.length) {
        pause();
        emit(true);
        return;
      }
      indexRef.current = next;
      wordsReadRef.current += 1;
      session.current.wordsRead = wordsReadRef.current;
      setIndex(next);
      setWordsRead(wordsReadRef.current);

      // Schedule from the intended time, not from now, so timer drift doesn't accumulate.
      nextAtRef.current += delayMs(tokens[next], wpmRef.current, timing);
      timerRef.current = setTimeout(step, Math.max(0, nextAtRef.current - performance.now()));
    };

    playingSinceRef.current = performance.now();
    setPlaying(true);
    nextAtRef.current = performance.now() + delayMs(tokens[indexRef.current], wpmRef.current, timing);
    timerRef.current = setTimeout(step, nextAtRef.current - performance.now());
  }, [tokens, timing, pause, emit]);

  const togglePlay = useCallback(() => {
    if (timerRef.current !== null) {
      pause();
      emit();
    } else {
      play();
    }
  }, [pause, play, emit]);

  const seek = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(Math.round(i), 0), Math.max(tokens.length - 1, 0));
      indexRef.current = clamped;
      setIndex(clamped);
    },
    [tokens.length],
  );

  const skip = useCallback((delta: number) => seek(indexRef.current + delta), [seek]);

  /** Jumps to the start of the current sentence, or the previous one if already there. */
  const previousSentence = useCallback(() => {
    let i = indexRef.current - 1;
    while (i > 0 && !endsSentence(tokens[i - 1])) i--;
    seek(Math.max(i, 0));
  }, [tokens, seek]);

  const changeWpm = useCallback((delta: number) => setManualWpm(clampWpm(wpmRef.current + delta)), []);
  const setWpm = useCallback((w: number) => setManualWpm(clampWpm(w)), []);

  // Periodic checkpoints while playing.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => emit(), checkpointEveryMs);
    return () => clearInterval(id);
  }, [playing, emit, checkpointEveryMs]);

  // Save when the tab is hidden (the user may never come back) and on unmount.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        pause();
        emit();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      pause();
      emit();
    };
  }, [pause, emit]);

  return {
    index,
    token: tokens[index] as Token | undefined,
    playing,
    wpm: clampWpm(wpm),
    wordsRead,
    rampActive: manualWpm === null && ramp.enabled && wpm < ramp.targetWpm,
    play,
    pause,
    togglePlay,
    seek,
    skip,
    previousSentence,
    changeWpm,
    setWpm,
    snapshot,
  };
}

function endsSentence(token: Token | undefined): boolean {
  if (!token) return true;
  return token.paragraphEnd || /[.!?…]["'’”)\]]*$/u.test(token.text);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
