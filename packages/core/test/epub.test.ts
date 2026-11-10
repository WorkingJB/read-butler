import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import { DOMParser } from "linkedom";
import { fromEpubFile } from "../src/ingest/epub";
import { DrmProtectedError } from "../src/ingest/types";

beforeAll(() => {
  // Node has no DOMParser; linkedom's is close enough for these fixtures.
  (globalThis as { DOMParser?: unknown }).DOMParser = DOMParser;
});

const xhtml = (body: string, bodyAttrs = "") =>
  `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>x</title></head><body ${bodyAttrs}>${body}</body></html>`;

async function epub(files: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new File([bytes], "book.epub");
}

const OPF = `<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <metadata><dc:title>A Test Book</dc:title><dc:creator>Jane Writer</dc:creator></metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="notes" href="text/notes.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="nav"/><itemref idref="cover" linear="no"/><itemref idref="c1"/><itemref idref="c2"/><itemref idref="notes"/></spine>
</package>`;

const BOOK = {
  "OEBPS/content.opf": OPF,
  "OEBPS/nav.xhtml": xhtml(
    `<nav epub:type="toc"><ol><li><a href="text/ch1.xhtml">Chapter One: Beginnings</a></li><li><a href="text/ch2.xhtml#start">Chapter Two</a></li></ol></nav>`,
  ),
  "OEBPS/cover.xhtml": xhtml("<p>Cover blurb</p>"),
  "OEBPS/text/ch1.xhtml": xhtml(
    `<section class="pg-boilerplate" id="pg-header"><p>The Project Gutenberg eBook licence header</p></section><h1>I</h1><p>It was a dark night.<a epub:type="noteref" href="notes.xhtml#n1">1</a> The end of one.</p>`,
  ),
  "OEBPS/text/ch2.xhtml": xhtml(`<h2>II</h2><p>Morning came.</p><p>*** END OF THE PROJECT GUTENBERG EBOOK A TEST BOOK ***</p><p>Licence text</p>`),
  "OEBPS/text/notes.xhtml": xhtml(`<aside epub:type="endnote" id="n1">A footnote.</aside>`, 'epub:type="endnotes"'),
};

describe("fromEpubFile", () => {
  it("names chapters from the table of contents and records the author", async () => {
    const doc = await fromEpubFile(await epub(BOOK));
    expect(doc.title).toBe("A Test Book");
    expect(doc.author).toBe("Jane Writer");
    expect(doc.sections.map((s) => s.title)).toEqual(["Chapter One: Beginnings", "Chapter Two"]);
  });

  it("skips the nav, non-linear items, footnotes and Gutenberg boilerplate", async () => {
    const { text } = await fromEpubFile(await epub(BOOK));
    expect(text).toContain("It was a dark night. The end of one.");
    expect(text).toContain("Morning came.");
    for (const junk of ["Cover blurb", "licence header", "A footnote", "Licence text", "END OF THE PROJECT", "Chapter One: Beginnings"]) {
      expect(text).not.toContain(junk);
    }
  });

  it("falls back to an EPUB 2 NCX for chapter names", async () => {
    const opf = OPF.replace('<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>', '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>')
      .replace('<itemref idref="nav"/>', "")
      .replace("<spine>", '<spine toc="ncx">');
    const ncx = `<ncx><navMap><navPoint><navLabel><text>Opening</text></navLabel><content src="text/ch1.xhtml"/></navPoint></navMap></ncx>`;
    const doc = await fromEpubFile(await epub({ ...BOOK, "OEBPS/content.opf": opf, "OEBPS/toc.ncx": ncx }));
    expect(doc.sections.map((s) => s.title)).toEqual(["Opening", "II"]);
  });

  it("refuses DRM-protected books", async () => {
    const encryption = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/><enc:CipherData><enc:CipherReference URI="OEBPS/text/ch1.xhtml"/></enc:CipherData></enc:EncryptedData></encryption>`;
    await expect(fromEpubFile(await epub({ ...BOOK, "META-INF/encryption.xml": encryption }))).rejects.toBeInstanceOf(DrmProtectedError);
  });

  it("allows font obfuscation, which isn't DRM", async () => {
    const encryption = `<encryption xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/><enc:CipherData><enc:CipherReference URI="OEBPS/fonts/a.otf"/></enc:CipherData></enc:EncryptedData></encryption>`;
    const doc = await fromEpubFile(await epub({ ...BOOK, "META-INF/encryption.xml": encryption }));
    expect(doc.text).toContain("Morning came.");
  });
});
