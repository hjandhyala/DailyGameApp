"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Usage" },
  { href: "/admin/games", label: "Moderation" },
  { href: "/", label: "View app" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1" aria-label="Admin">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : l.href !== "/" && path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
