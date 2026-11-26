"use client";
import Link from "next/link";
import { Cloud, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useSyncStatus } from "@/lib/client/hooks";

export function SyncBadge() {
  const s = useSyncStatus();
  const map = {
    idle: { icon: Cloud, label: "Synced", cls: "text-ink-2" },
    syncing: { icon: RefreshCw, label: "Syncing…", cls: "text-ink-2 [&_svg]:animate-spin" },
    error: { icon: TriangleAlert, label: "Sync error", cls: "text-warn" },
    offline: { icon: CloudOff, label: "Offline", cls: "text-ink-2" },
    off: { icon: CloudOff, label: "Not synced", cls: "text-ink-2" },
  } as const;
  const m = map[s.state];
  return (
    <Link href="/settings#sync" title={s.error ?? m.label} className={`btn btn-ghost !p-2 ${m.cls}`} aria-label={m.label}>
      <m.icon size={18} />
    </Link>
  );
}
