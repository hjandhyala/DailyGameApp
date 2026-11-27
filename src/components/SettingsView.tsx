"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Copy, Download, Eye, EyeOff, Link2, RefreshCw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSettings, useSyncStatus } from "@/lib/client/hooks";
import { storage } from "@/lib/client/device";
import { clearAllData, exportData, importData, setSetting } from "@/lib/client/store";
import { cleanSecret, deleteRemote, enableSync, formatSecret, getSecret, linkDevice, regenerateSecret, syncNow, unlinkDevice } from "@/lib/client/sync";

export function SettingsView() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-black">Settings</h1>
      <SyncSection />
      <Preferences />
      <DataSection />
      <section className="card p-5 text-sm text-ink-2">
        <h2 className="mb-1 font-black text-ink">Privacy</h2>
        <p>
          No account, no email. Your favorites and history live in this browser. Syncing stores them on our server under a secret code
          only your devices know. We count anonymous visits and plays (a salted hash of a random device ID) to see how many people use the app.
        </p>
      </section>
    </div>
  );
}

function SyncSection() {
  const status = useSyncStatus();
  const params = useSearchParams();
  const [secret, setSecret] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState(params.get("link") ?? "");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
  useEffect(() => setSecret(getSecret()), [status]);
  useEffect(() => {
    if (!secret || !show) return;
    const url = `${location.origin}/settings?link=${formatSecret(secret)}#sync`;
    QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr);
  }, [secret, show]);

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      setSecret(getSecret());
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const linkingSame = secret && cleanSecret(code) === secret;

  return (
    <section id="sync" className="card scroll-mt-20 space-y-4 p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-black">Sync across devices</h2>
        <span className="ml-auto text-xs font-bold text-ink-2">
          {status.state === "syncing"
            ? "Syncing…"
            : status.state === "error"
              ? `Sync error: ${status.error}`
              : status.lastSyncAt
                ? `Synced ${new Date(status.lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : status.state === "off"
                  ? "Off"
                  : ""}
        </span>
      </div>

      {secret ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">This is your sync code. Enter it (or scan the QR) on another device to share favorites and history. Treat it like a password.</p>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
            <code className="flex-1 select-all break-all font-mono text-sm font-bold tracking-wider sm:text-base">
              {show ? formatSecret(secret) : "••••-••••-••••-••••-••••-••••-••"}
            </code>
            <button className="btn btn-ghost !p-2" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide code" : "Show code"}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              className="btn btn-ghost !p-2"
              aria-label="Copy code"
              onClick={() => navigator.clipboard.writeText(formatSecret(secret)).then(() => setMsg({ ok: true, text: "Code copied" }))}
            >
              <Copy size={18} />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {show && qr && <img src={qr} alt="QR code to link another device" className="mx-auto size-44 rounded-xl bg-white p-2" />}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-soft" onClick={() => run(syncNow, "Synced")} disabled={busy}>
              <RefreshCw size={15} /> Sync now
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => confirm("Create a new code? Other devices will stop syncing until you link them with the new code.") && run(regenerateSecret, "New code created")}
            >
              New code
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => confirm("Stop syncing on this device? Your data stays here.") && run(async () => unlinkDevice(), "This device is no longer syncing")}>
              Unlink this device
            </button>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() => confirm("Delete the synced copy from the server? Data stays on each device, but they'll stop syncing.") && run(deleteRemote, "Synced copy deleted")}
            >
              Delete synced copy
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-ink-2">Sync turns on automatically once you favorite a game. Or link this device to one you already use:</p>
          <button className="btn btn-soft" onClick={() => run(enableSync, "Sync is on")} disabled={busy}>
            Turn on sync
          </button>
        </div>
      )}

      <form
        className="space-y-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => linkDevice(code, mode), "Linked! Your data is syncing.");
        }}
      >
        <h3 className="flex items-center gap-1.5 text-sm font-black">
          <Link2 size={15} /> Link to another device
        </h3>
        <input className="input font-mono uppercase" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Sync code" autoComplete="off" />
        <div className="flex flex-wrap gap-2 text-sm">
          <label className="chip cursor-pointer" aria-pressed={mode === "merge"}>
            <input type="radio" className="sr-only" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge with this device
          </label>
          <label className="chip cursor-pointer" aria-pressed={mode === "replace"}>
            <input type="radio" className="sr-only" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace this device’s data
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy || cleanSecret(code).length !== 26 || !!linkingSame}>
          {linkingSame ? "Already linked" : "Link device"}
        </button>
      </form>
      {msg && (
        <p role="status" className={`text-sm font-bold ${msg.ok ? "text-good" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}

function Preferences() {
  const settings = useSettings();
  const [theme, setTheme] = useState("system");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
  useEffect(() => setTheme(storage.get("dgh.theme") ?? "system"), []);
  function applyTheme(t: string) {
    setTheme(t);
    applyThemeAttr(t);
  }
  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-black">Preferences</h2>
      <div>
        <p className="mb-1 text-sm font-bold">Theme</p>
        <div className="flex gap-2">
          {["system", "light", "dark"].map((t) => (
            <button key={t} className="chip capitalize" aria-pressed={theme === t} onClick={() => applyTheme(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">New day starts at</span>
        <select className="input sm:!w-56" value={settings.dayStartHour} onChange={(e) => setSetting("dayStartHour", Number(e.target.value))}>
          {[0, 1, 2, 3, 4, 5, 6].map((h) => (
            <option key={h} value={h}>
              {h === 0 ? "Midnight (default)" : `${h}:00 am`}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-ink-2">Night owl? Plays before this hour count toward the previous day.</span>
      </label>
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={settings.promptAfterPlay} onChange={(e) => setSetting("promptAfterPlay", e.target.checked)} />
        <span className="text-sm font-bold">Ask “Did you finish?” when I come back from a game</span>
      </label>
      <Link href="/?tour=1" className="btn btn-soft">
        Show the welcome tour
      </Link>
    </section>
  );
}

function applyThemeAttr(t: string) {
  const root = document.documentElement;
  if (t === "system") {
    storage.remove("dgh.theme");
    root.removeAttribute("data-theme");
  } else {
    storage.set("dgh.theme", t);
    root.setAttribute("data-theme", t);
  }
}

function DataSection() {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function doExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dailygames-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function doImport(f: File) {
    try {
      await importData(JSON.parse(await f.text()));
      setMsg("Imported!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    }
  }
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-black">Your data</h2>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-soft" onClick={doExport}>
          <Download size={15} /> Export
        </button>
        <button className="btn btn-soft" onClick={() => file.current?.click()}>
          <Upload size={15} /> Import
        </button>
        <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        <button
          className="btn btn-danger ml-auto"
          onClick={async () => {
            if (!confirm("Erase all favorites and history from this browser? If sync is on, other devices keep their copy.")) return;
            unlinkDevice();
            await clearAllData();
            setMsg("Cleared");
          }}
        >
          Erase this device
        </button>
      </div>
      {msg && <p className="text-sm font-bold">{msg}</p>}
    </section>
  );
}
