import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
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
        <header className="relative border-b border-line">
          <nav className="mx-auto flex min-h-14 max-w-5xl items-center gap-6 px-4 py-2 text-sm">
            <Link href="/" className="font-semibold">
              Read Butler
            </Link>
            <Suspense fallback={null}>
              <SiteNav />
            </Suspense>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
