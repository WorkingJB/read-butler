const BLOCK_TAGS = new Set([
  "P", "DIV", "SECTION", "ARTICLE", "LI", "BLOCKQUOTE", "PRE", "TR",
  "H1", "H2", "H3", "H4", "H5", "H6", "BR", "HR", "FIGCAPTION",
]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "NAV", "HEAD"]);

/**
 * Converts an HTML element to plain text, keeping paragraph breaks.
 * `innerText` would do this in a page, but it needs layout, which detached
 * documents (DOMParser, EPUB chapters) do not have.
 */
export function htmlToText(root: Node): string {
  const out: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      out.push(node.textContent ?? "");
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node as Element).tagName.toUpperCase();
    if (SKIP_TAGS.has(tag)) return;
    const block = BLOCK_TAGS.has(tag);
    if (block) out.push("\n\n");
    node.childNodes.forEach(walk);
    if (block) out.push("\n\n");
  };
  walk(root);
  return out
    .join("")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/([^\n])\n([^\n])/g, "$1 $2");
}

export function parseHtml(html: string, type: DOMParserSupportedType = "text/html"): Document {
  return new DOMParser().parseFromString(html, type);
}
