"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Phone-width menu: a toggle button and a full-width panel below the header. */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  // Remember which page the menu was opened on: the layout stays mounted across
  // navigations, so this closes the panel on route change without an effect.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="ml-auto sm:hidden">
      <button
        type="button"
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-foreground/5"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
      </button>
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-20 border-b border-line bg-background text-base shadow-sm"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
