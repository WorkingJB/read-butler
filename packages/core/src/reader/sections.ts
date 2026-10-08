export interface Section {
  title: string;
  /** Index of the first word of the section in the tokenized body. */
  wordIndex: number;
}

/** Returns the section containing `wordIndex`, if any. */
export function sectionAt(sections: Section[], wordIndex: number): Section | undefined {
  let current: Section | undefined;
  for (const s of sections) {
    if (s.wordIndex > wordIndex) break;
    current = s;
  }
  return current;
}
