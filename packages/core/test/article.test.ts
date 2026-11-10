import { describe, expect, it } from "vitest";
import { canonicalUrl, extractArticle } from "../src/ingest/article";

const para = (s: string) => `<p>${s} ${"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor. ".repeat(6)}</p>`;

const WIKI = `<!doctype html><html><head>
  <title>Speed reading - Wikipedia</title>
  <link rel="canonical" href="https://en.wikipedia.org/wiki/Speed_reading">
  <meta property="og:site_name" content="Wikipedia">
</head><body>
  <nav><a href="/">Main page</a><a href="/random">Random article</a></nav>
  <div id="content"><h1>Speed reading</h1>
    <div class="hatnote">For the album, see Speed Reading (album).</div>
    <table class="infobox"><tr><td>Infobox junk value</td></tr></table>
    <div id="toc" class="toc">Contents 1 History 2 Methods</div>
    ${para("Speed reading is any of many techniques.<sup class=\"reference\"><a>[1]</a></sup> It works[citation needed] sometimes.")}
    <h2>History<span class="mw-editsection">[edit]</span></h2>
    ${para("Early research began in the twentieth century.")}
    <h2>Methods</h2>
    ${para("RSVP shows one word at a time.")}
    <h2>See also</h2><ul><li>Reading</li><li>Skimming</li></ul>
    <h2>References</h2><ol class="references"><li>Some citation</li></ol>
  </div>
  <div class="navbox">Navbox links everywhere</div>
  <footer>Text is available under licence.</footer>
</body></html>`;

describe("extractArticle", () => {
  const doc = extractArticle({ html: WIKI, url: "https://en.m.wikipedia.org/wiki/Speed_reading#History" });

  it("keeps the article and drops page furniture", () => {
    expect(doc.text).toContain("Speed reading is any of many techniques.");
    expect(doc.text).toContain("RSVP shows one word at a time.");
    for (const junk of ["Random article", "Infobox junk", "Contents 1", "For the album", "Navbox links", "licence"]) {
      expect(doc.text).not.toContain(junk);
    }
  });

  it("strips citation markers and edit links", () => {
    expect(doc.text).not.toMatch(/\[(1|citation needed|edit)\]/);
    expect(doc.text).toContain("It works sometimes.");
  });

  it("splits at headings and drops back matter", () => {
    expect(doc.sections.map((s) => s.title)).toEqual(["History", "Methods"]);
    expect(doc.text).not.toContain("Some citation");
    expect(doc.text).not.toContain("Skimming");
  });

  it("records title, site and the canonical URL", () => {
    expect(doc.title).toBe("Speed reading");
    expect(doc.siteName).toBe("Wikipedia");
    expect(doc.sourceType).toBe("url");
    expect(doc.sourceName).toBe("https://en.wikipedia.org/wiki/Speed_reading");
  });

  it("falls back to the hostname for site name", () => {
    const blog = extractArticle({
      html: `<html><head><title>My post | example.com</title></head><body><article>${para("Body text.")}${para("More.")}</article></body></html>`,
      url: "https://www.example.com/post",
    });
    expect(blog.siteName).toBe("example.com");
    expect(blog.title).toBe("My post");
  });
});

describe("canonicalUrl", () => {
  it("drops fragments and tracking parameters but keeps real ones", () => {
    expect(canonicalUrl("https://site.com/a?id=4&utm_source=x&fbclid=y#top")).toBe("https://site.com/a?id=4");
  });

  it("ignores canonical links to another site or to the home page", () => {
    expect(canonicalUrl("https://blog.site.com/post", "https://evil.com/post")).toBe("https://blog.site.com/post");
    expect(canonicalUrl("https://site.com/post", "https://site.com/")).toBe("https://site.com/post");
  });
});
