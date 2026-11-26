"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Compass, Plus, Settings, Sun } from "lucide-react";
import { SyncBadge } from "./SyncBadge";

const LINKS = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <Logo />
            <span className="text-lg">DailyGames</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 sm:flex" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${active(l.href) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SyncBadge />
            <Link href="/add" className="btn btn-primary !px-3 sm:!px-4" aria-label="Add a game">
              <Plus size={18} strokeWidth={3} />
              <span className="hidden sm:inline">Add game</span>
            </Link>
          </div>
        </div>
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <div className="grid grid-cols-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${active(l.href) ? "text-accent" : "text-ink-2"}`}
            >
              <l.icon size={22} strokeWidth={active(l.href) ? 2.6 : 2} />
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect x="6" y="6" width="9" height="9" rx="2.5" fill="#fff" />
      <rect x="17" y="6" width="9" height="9" rx="2.5" fill="#fff" opacity=".55" />
      <rect x="6" y="17" width="9" height="9" rx="2.5" fill="#fff" opacity=".55" />
      <path d="M18.5 21.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
