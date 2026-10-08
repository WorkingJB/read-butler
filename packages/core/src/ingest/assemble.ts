import { countWords, normalize } from "../reader/tokenize";
import type { Section } from "../reader/sections";

export interface Chapter {
  title?: string;
  text: string;
}

/** Joins chapters into one body and records where each one starts. */
export function assembleChapters(chapters: Chapter[]): { text: string; sections: Section[] } {
  const parts: string[] = [];
  const sections: Section[] = [];
  let wordIndex = 0;

  for (const chapter of chapters) {
    const text = normalize(chapter.text);
    if (!text) continue;
    if (chapter.title) sections.push({ title: chapter.title, wordIndex });
    parts.push(text);
    wordIndex += countWords(text);
  }
  return { text: parts.join("\n\n"), sections };
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
}

export function titleFromText(text: string): string {
  const firstLine = normalize(text).split("\n")[0] ?? "";
  const words = firstLine.split(/\s+/).slice(0, 8).join(" ");
  return words.length > 0 ? words.slice(0, 80) : "Untitled";
}
