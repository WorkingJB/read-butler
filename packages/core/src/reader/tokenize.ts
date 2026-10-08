export interface Token {
  /** The word as displayed, punctuation included. */
  text: string;
  /** True when this word is the last one before a blank line. */
  paragraphEnd: boolean;
}

/**
 * Splits text into display tokens on whitespace.
 *
 * The rule is intentionally simple: one token per whitespace-separated run.
 * The database computes `word_count` with the same rule (see the
 * `create_document` SQL function), so saved word indexes line up with what
 * every client renders.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const paragraphs = normalize(text).split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    words.forEach((word, i) => {
      tokens.push({ text: word, paragraphEnd: i === words.length - 1 });
    });
  }
  return tokens;
}

export function countWords(text: string): number {
  return normalize(text).split(/\s+/).filter(Boolean).length;
}

/** Cleans up text pulled out of PDFs, EPUBs and web pages. */
export function normalize(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      // Soft hyphens and zero-width characters from PDFs and EPUBs.
      .replace(/[­​-‍﻿]/g, "")
      // Rejoin words hyphenated across a line break ("exam-\nple").
      .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
      .replace(/[ \t\f\v ]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
