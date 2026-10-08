import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Read anything faster, one word at a time.</h1>
      <p className="mt-4 text-lg text-muted">
        Paste text or drop in a PDF, EPUB or Word file. Words flash in place so your eyes stop moving, and the
        speed climbs as you warm up. Free, with your library synced between the web and the Chrome extension.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/try" className="btn btn-primary">
          Try it now
        </Link>
        <Link href="/login" className="btn">
          Sign in to save your library
        </Link>
      </div>
      <ul className="mt-12 grid gap-6 text-left sm:grid-cols-3">
        <li>
          <h2 className="font-semibold">Any text</h2>
          <p className="text-sm text-muted">Paste, upload PDF, EPUB, DOCX, TXT, Markdown or HTML, or import a web page.</p>
        </li>
        <li>
          <h2 className="font-semibold">Speed training</h2>
          <p className="text-sm text-muted">
            Each session ramps up to your target speed, and the target rises when you report good comprehension.
          </p>
        </li>
        <li>
          <h2 className="font-semibold">Private by default</h2>
          <p className="text-sm text-muted">Files are parsed in your browser. Only the extracted text is saved, and only if you sign in.</p>
        </li>
      </ul>
    </div>
  );
}
