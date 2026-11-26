"use client";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { shortDay } from "@/components/charts/useWidth";
import type { DayPoint } from "@/lib/server/analytics";

export function UsageCharts({ series }: { series: DayPoint[] }) {
  const days = series.map((p) => p.day);
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-black">Total users</h2>
          <p className="mb-3 text-xs text-ink-2">Cumulative unique devices, last 30 days</p>
          <LineChart days={days} area series={[{ key: "total", label: "Total users", color: "var(--viz-1)", values: series.map((p) => p.total) }]} />
        </div>
        <div className="card p-5">
          <h2 className="font-black">Daily users</h2>
          <p className="mb-1 text-xs text-ink-2">Active and first-time devices per day</p>
          <LineChart
            days={days}
            series={[
              { key: "active", label: "Active users", color: "var(--viz-1)", values: series.map((p) => p.active) },
              { key: "new", label: "New users", color: "var(--viz-2)", values: series.map((p) => p.new) },
            ]}
          />
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-black">Games played</h2>
        <p className="mb-3 text-xs text-ink-2">Games marked done per day (one per game per device)</p>
        <BarChart days={days} values={series.map((p) => p.plays)} label="Games played" />
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-bold text-ink-2">View as table</summary>
          <div className="mt-2 max-h-72 overflow-auto">
            <table className="w-full text-right tabular-nums">
              <thead className="sticky top-0 bg-surface text-xs uppercase text-ink-2">
                <tr>
                  <th className="py-1 text-left">Day</th>
                  <th>Total</th>
                  <th>Active</th>
                  <th>New</th>
                  <th>Plays</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((p) => (
                  <tr key={p.day} className="border-t border-line">
                    <td className="py-1 text-left">{shortDay(p.day)}</td>
                    <td>{p.total}</td>
                    <td>{p.active}</td>
                    <td>{p.new}</td>
                    <td>{p.plays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
