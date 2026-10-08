"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  remainingMs,
  sectionAt,
  splitAtOrp,
  tokenize,
  DEFAULT_RAMP,
  type RampSettings,
  type Section,
  type TimingOptions,
} from "@speedread/core";
import { useRsvp, type Checkpoint } from "./useRsvp";

export interface RsvpReaderProps {
  text: string;
  title?: string;
  sections?: Section[];
  initialIndex?: number;
  ramp?: RampSettings;
  timing?: TimingOptions;
  /** Multiplies the word size; 1 is the default. */
  fontScale?: number;
  /** Persist progress and session stats. Called often; debounce network work if needed. */
  onCheckpoint?: (c: Checkpoint) => void;
  /** Shown after the last word. Receives a 1-5 self rating of comprehension. */
  onRateComprehension?: (rating: number, c: Checkpoint) => void;
  autoFocus?: boolean;
}

const CONTEXT_WORDS = 40;

export function RsvpReader({
  text,
  title,
  sections = [],
  initialIndex = 0,
  ramp = DEFAULT_RAMP,
  timing,
  fontScale = 1,
  onCheckpoint,
  onRateComprehension,
  autoFocus = true,
}: RsvpReaderProps) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const [finished, setFinished] = useState<Checkpoint | null>(null);
  const [rated, setRated] = useState(false);

  const r = useRsvp({
    tokens,
    initialIndex,
    ramp,
    timing,
    onCheckpoint: (c) => {
      if (c.finished) setFinished(c);
      onCheckpoint?.(c);
    },
  });

  // The listener reads the latest controls through a ref so it is bound once.
  const controls = useRef(r);
  useEffect(() => {
    controls.current = r;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const r = controls.current;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && target.getAttribute("type") !== "range") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          r.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) r.skip(-50);
          else r.previousSentence();
          break;
        case "ArrowRight":
          e.preventDefault();
          r.skip(e.shiftKey ? 50 : 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          r.changeWpm(25);
          break;
        case "ArrowDown":
          e.preventDefault();
          r.changeWpm(-25);
          break;
        case "Escape":
          if (r.playing) r.togglePlay();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (tokens.length === 0) {
    return <div className="sr-reader sr-empty">There is no text to read.</div>;
  }

  const [before, pivot, after] = splitAtOrp(r.token?.text ?? "");
  const section = sectionAt(sections, r.index);
  const percent = tokens.length > 1 ? (r.index / (tokens.length - 1)) * 100 : 100;
  const minutesLeft = Math.ceil(remainingMs(tokens, r.index, r.wpm, timing) / 60_000);

  const contextStart = Math.max(0, r.index - CONTEXT_WORDS / 2);
  const context = tokens.slice(contextStart, contextStart + CONTEXT_WORDS);

  return (
    <div className="sr-reader" style={{ ["--sr-scale" as string]: fontScale }}>
      <header className="sr-header">
        <div className="sr-titles">
          {title && <h1 className="sr-title">{title}</h1>}
          {section && <p className="sr-section">{section.title}</p>}
        </div>
        <div className="sr-speed" aria-live="polite">
          <strong>{r.wpm}</strong> wpm{r.rampActive && <span className="sr-badge">warming up</span>}
        </div>
      </header>

      <button
        type="button"
        className="sr-stage"
        onClick={r.togglePlay}
        aria-label={r.playing ? "Pause" : "Play"}
        autoFocus={autoFocus}
      >
        <span className="sr-guide sr-guide-top" aria-hidden />
        <span className="sr-word" aria-live="off">
          <span className="sr-before">{before}</span>
          <span className="sr-pivot">{pivot}</span>
          <span className="sr-after">{after}</span>
        </span>
        <span className="sr-guide sr-guide-bottom" aria-hidden />
        {!r.playing && r.index === initialIndex && r.wordsRead === 0 && (
          <span className="sr-hint">Press space or tap to start</span>
        )}
      </button>

      <input
        className="sr-progress"
        type="range"
        min={0}
        max={tokens.length - 1}
        value={r.index}
        onChange={(e) => r.seek(Number(e.target.value))}
        aria-label="Position"
        style={{ ["--sr-percent" as string]: `${percent}%` }}
      />
      <div className="sr-meta">
        <span>
          {r.index + 1} / {tokens.length} words
        </span>
        <span>{minutesLeft} min left</span>
      </div>

      <div className="sr-controls">
        <button type="button" onClick={r.previousSentence} title="Previous sentence (←)">
          ⟲ Sentence
        </button>
        <button type="button" onClick={() => r.changeWpm(-25)} title="Slower (↓)">
          − 25
        </button>
        <button type="button" className="sr-primary" onClick={r.togglePlay}>
          {r.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => r.changeWpm(25)} title="Faster (↑)">
          + 25
        </button>
        <button type="button" onClick={() => r.skip(10)} title="Skip 10 words (→)">
          10 ⟳
        </button>
      </div>

      {!r.playing && (
        <p className="sr-context">
          {context.map((t, i) => {
            const at = contextStart + i;
            return (
              <span key={at}>
                <button
                  type="button"
                  className={at === r.index ? "sr-context-word sr-current" : "sr-context-word"}
                  onClick={() => r.seek(at)}
                >
                  {t.text}
                </button>{" "}
              </span>
            );
          })}
        </p>
      )}

      {finished && onRateComprehension && !rated && (
        <div className="sr-rate" role="group" aria-label="Rate your comprehension">
          <p>Done. How much did you take in?</p>
          <div className="sr-rate-buttons">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setRated(true);
                  onRateComprehension(n, finished);
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="sr-rate-scale">
            <span>Lost</span>
            <span>Everything</span>
          </p>
        </div>
      )}

      <p className="sr-keys">Space play/pause · ←/→ back/forward · ↑/↓ speed</p>
    </div>
  );
}
