import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { NavAuth } from "@/components/NavAuth";
import "@readbutler/reader-ui/reader.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Read Butler",
  description: "Paste or upload any text and speed read it one word at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">
              Read Butler
            </Link>
            <Link href="/try" className="text-muted hover:text-foreground">
              Try it
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <Suspense fallback={null}>
                <NavAuth />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
