/** A public-domain book from Project Gutenberg's catalog (via Gutendex). */
export interface GutenbergBook {
  id: number;
  title: string;
  authors: string[];
  downloads: number;
}

export const gutenbergUrl = (id: number) => `https://www.gutenberg.org/ebooks/${id}`;
