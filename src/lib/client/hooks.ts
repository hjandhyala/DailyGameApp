"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { localDay } from "@/lib/shared/dates";
import { db } from "./db";
import { DEFAULT_SETTINGS, getSettings, viewOfCatalog, viewOfCustom, type GameView, type Settings } from "./store";
import { subscribeSync, type SyncStatus, getSyncStatus } from "./sync";

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}

/** Today's local day key; re-renders at rollover. */
export function useToday() {
  const { dayStartHour } = useSettings();
  const [day, setDay] = useState(() => localDay(new Date(), dayStartHour));
  useEffect(() => {
    const tick = () => setDay(localDay(new Date(), dayStartHour));
    tick();
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [dayStartHour]);
  return day;
}

export function useFavorites() {
  return useLiveQuery(async () => {
    const favs = (await db.favorites.orderBy("order").toArray()).filter((f) => !f.deleted);
    const views: GameView[] = [];
    for (const f of favs) {
      if (f.ref.startsWith("custom:")) {
        const g = await db.customGames.get(f.ref);
        if (g && !g.deleted) views.push(viewOfCustom(g));
      } else {
        const g = await db.catalog.get(f.ref);
        if (g) views.push(viewOfCatalog(g));
        else views.push({ ref: f.ref, name: f.ref, url: "#", host: "", iconUrl: null, category: "other", description: "", isCustom: false });
      }
    }
    return views;
  }, []);
}

export function useFavoriteRefs() {
  return useLiveQuery(async () => new Set((await db.favorites.toArray()).filter((f) => !f.deleted).map((f) => f.ref)), [], new Set<string>());
}

export function usePlays() {
  return useLiveQuery(async () => (await db.plays.toArray()).filter((p) => !p.deleted), [], []);
}

export function useSyncStatus() {
  const [s, setS] = useState<SyncStatus>(getSyncStatus);
  useEffect(() => {
    const unsub = subscribeSync(setS);
    return () => {
      unsub();
    };
  }, []);
  return s;
}
