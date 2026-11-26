"use client";
import { useEffect } from "react";
import { refreshCatalog, trackVisit } from "@/lib/client/store";
import { startAutoSync } from "@/lib/client/sync";

export function ClientInit() {
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    startAutoSync();
    trackVisit();
    void refreshCatalog();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
