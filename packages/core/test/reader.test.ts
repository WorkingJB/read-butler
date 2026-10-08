import { describe, expect, it } from "vitest";
import {
  countWords,
  delayMs,
  normalize,
  orpIndex,
  sectionAt,
  splitAtOrp,
  suggestNextTarget,
  tokenize,
  wpmAt,
  DEFAULT_RAMP,
} from "../src";
import { assembleChapters } from "../src/ingest/assemble";
import { stripMarkdown } from "../src/ingest/text";

describe("tokenize", () => {
  it("splits on whitespace and marks paragraph ends", () => {
    const tokens = tokenize("Hello there, world.\n\nNext  paragraph");
    expect(tokens.map((t) => t.text)).toEqual(["Hello", "there,", "world.", "Next", "paragraph"]);
    expect(tokens.map((t) => t.paragraphEnd)).toEqual([false, false, true, false, true]);
  });

  it("agrees with countWords, which mirrors the SQL word count", () => {
    const text = "  One\ttwo\n\n\nthree  four five ";
    expect(tokenize(text)).toHaveLength(countWords(text));
    expect(countWords(text)).toBe(5);
  });

  it("returns nothing for blank input", () => {
    expect(tokenize("   \n\n ")).toEqual([]);
  });
});

describe("normalize", () => {
  it("rejoins words hyphenated across lines and strips soft hyphens", () => {
    expect(normalize("exam-\nple co­operate")).toBe("example cooperate");
  });

  it("keeps real hyphenated compounds", () => {
    expect(normalize("well-\nKnown")).toBe("well-\nKnown");
  });
});

describe("orp", () => {
  it.each([
    ["a", 0],
    ["word", 1],
    ["reading", 2],
    ["comprehension", 3],
    ["incomprehensibility", 4],
  ])("pivot of %s is %i", (word, index) => {
    expect(orpIndex(word)).toBe(index);
  });

  it("skips leading punctuation", () => {
    expect(splitAtOrp("“word")).toEqual(["“w", "o", "rd"]);
  });

  it("handles empty strings", () => {
    expect(splitAtOrp("")).toEqual(["", "", ""]);
  });
});

describe("timing", () => {
  const word = (text: string, paragraphEnd = false) => ({ text, paragraphEnd });

  it("uses 60000/wpm for a plain word", () => {
    expect(delayMs(word("plain"), 300)).toBe(200);
  });

  it("pauses longer at sentence and clause ends", () => {
    expect(delayMs(word("end."), 300)).toBe(400);
    expect(delayMs(word('end."'), 300)).toBe(400);
    expect(delayMs(word("pause,"), 300)).toBe(300);
  });

  it("pauses longest at paragraph ends", () => {
    expect(delayMs(word("end.", true), 300)).toBe(500);
  });
});

describe("ramp", () => {
  it("steps up to the target and stops", () => {
    const ramp = { ...DEFAULT_RAMP, startWpm: 200, targetWpm: 300, stepWpm: 50, stepEveryWords: 100 };
    expect(wpmAt(0, ramp)).toBe(200);
    expect(wpmAt(99, ramp)).toBe(200);
    expect(wpmAt(100, ramp)).toBe(250);
    expect(wpmAt(10_000, ramp)).toBe(300);
  });

  it("goes straight to the target when disabled", () => {
    expect(wpmAt(0, { ...DEFAULT_RAMP, enabled: false })).toBe(DEFAULT_RAMP.targetWpm);
  });

  it("only moves the target after a real session with a rating", () => {
    const r = { ...DEFAULT_RAMP, targetWpm: 400, stepWpm: 25 };
    expect(suggestNextTarget(r, { endWpm: 400, wordsRead: 100, comprehension: 5 })).toBe(400);
    expect(suggestNextTarget(r, { endWpm: 400, wordsRead: 1000 })).toBe(400);
    expect(suggestNextTarget(r, { endWpm: 400, wordsRead: 1000, comprehension: 4 })).toBe(425);
    expect(suggestNextTarget(r, { endWpm: 400, wordsRead: 1000, comprehension: 2 })).toBe(375);
    expect(suggestNextTarget(r, { endWpm: 400, wordsRead: 1000, comprehension: 3 })).toBe(400);
  });
});

describe("assembleChapters", () => {
  it("records each chapter's starting word index", () => {
    const { text, sections } = assembleChapters([
      { title: "One", text: "a b c" },
      { title: "Empty", text: "  " },
      { title: "Two", text: "d e" },
    ]);
    expect(sections).toEqual([
      { title: "One", wordIndex: 0 },
      { title: "Two", wordIndex: 3 },
    ]);
    expect(tokenize(text)[3].text).toBe("d");
    expect(sectionAt(sections, 4)?.title).toBe("Two");
    expect(sectionAt(sections, 2)?.title).toBe("One");
  });
});

describe("stripMarkdown", () => {
  it("removes syntax but keeps the words", () => {
    expect(stripMarkdown("# Title\n\nSome **bold** and [a link](http://x.y).").trim()).toBe(
      "Title\n\nSome bold and a link.",
    );
  });
});
