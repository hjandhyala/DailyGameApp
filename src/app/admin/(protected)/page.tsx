import type { Metadata } from "next";
import { UsageCharts } from "@/components/admin/UsageCharts";
import { usageOverview } from "@/lib/server/analytics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usage" };

export default async function AdminDashboard() {
  const u = await usageOverview(30);
  const wauDelta = u.prevWau ? Math.round(((u.wau - u.prevWau) / u.prevWau) * 100) : null;
  const stickiness = u.mau ? Math.round((u.dau / u.mau) * 100) : 0;
  const totalPlatforms = u.platforms.reduce((a, p) => a + p.n, 0) || 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <h1 className="text-3xl font-black">Usage</h1>
          <p className="text-sm text-ink-2">Anonymous devices (no accounts). Days are UTC · today is {u.today}.</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total users" value={u.totalUsers} sub={`+${u.newToday} today`} hero />
        <Kpi label="Active today" value={u.dau} sub={`${stickiness}% of monthly (DAU/MAU)`} />
        <Kpi label="Weekly active" value={u.wau} sub={wauDelta === null ? "vs. prior 7 days: —" : `${wauDelta >= 0 ? "▲" : "▼"} ${Math.abs(wauDelta)}% vs. prior 7 days`} />
        <Kpi label="Monthly active" value={u.mau} sub="last 30 days" />
        <Kpi label="Games played today" value={u.playsToday} sub={`${u.plays30.toLocaleString("en-US")} in 30 days`} />
        <Kpi label="Syncing users" value={u.syncUsers} sub="sync codes in use" />
        <Kpi label="Catalog" value={u.catalog.active} sub={`${u.catalog.community} community-added`} />
        <Kpi label="Hidden by reports" value={u.catalog.hidden} sub={`${u.openReports} reports to review`} warn={u.catalog.hidden > 0} />
      </section>

      <UsageCharts series={u.series} />

      <section className="grid gap-4 md:grid-cols-3">
        <BarList title="Most played (7 days)" rows={u.topPlayed.map((g) => ({ label: g.name, value: g.plays }))} empty="No plays recorded yet." />
        <BarList title="Most favorited" rows={u.topFavorited.filter((g) => g.n > 0).map((g) => ({ label: g.name, value: g.n }))} empty="No favorites yet." />
        <div className="card p-5">
          <h2 className="mb-3 font-black">Devices</h2>
          {u.platforms.length === 0 ? (
            <p className="text-sm text-ink-2">No users yet.</p>
          ) : (
            <ul className="space-y-3">
              {u.platforms
                .sort((a, b) => b.n - a.n)
                .map((p) => (
                  <li key={p.platform}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold capitalize">{p.platform}</span>
                      <span className="text-ink-2">
                        <span className="font-black text-ink">{p.n.toLocaleString("en-US")}</span> · {Math.round((p.n / totalPlatforms) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full" style={{ width: `${(p.n / totalPlatforms) * 100}%`, background: "var(--viz-1)" }} />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, hero, warn }: { label: string; value: number; sub: string; hero?: boolean; warn?: boolean }) {
  return (
    <div className={`card p-4 ${hero ? "bg-accent-soft" : ""}`}>
      <div className="text-xs font-bold uppercase text-ink-2">{label}</div>
      <div className={`mt-1 font-black tabular-nums ${hero ? "text-4xl" : "text-3xl"} ${warn ? "text-warn" : ""}`}>{value.toLocaleString("en-US")}</div>
      <div className="mt-0.5 text-xs text-ink-2">{sub}</div>
    </div>
  );
}

function BarList({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-black">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-2">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="truncate font-bold">{r.label}</span>
                <span className="font-black tabular-nums">{r.value.toLocaleString("en-US")}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2">
                <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--viz-1)" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
