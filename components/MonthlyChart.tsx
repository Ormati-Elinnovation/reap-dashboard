"use client";
import { monthLabel } from "@/lib/months";
import { fmt } from "@/lib/format";

export default function MonthlyChart({
  months,
  totals,
  partial,
  title = "הוצאות חודשיות",
}: {
  months: string[];
  totals: Record<string, number>;
  partial: string | null;
  title?: string;
}) {
  const vals = months.map((m) => totals[m] || 0);
  const max = Math.max(1, ...vals);
  const n = months.length;
  let trend: { pct: number; up: boolean } | null = null;
  if (n >= 2 && vals[n - 2] > 0) {
    const a = vals[n - 2];
    const b = vals[n - 1];
    trend = { pct: ((b - a) / a) * 100, up: b >= a };
  }

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="lbl">{title}</div>
        {trend && (
          <div style={{ fontSize: 12, fontWeight: 700, color: trend.up ? "var(--exp)" : "#3fb950" }}>
            {trend.up ? "▲" : "▼"} {Math.abs(trend.pct).toFixed(0)}% מהחודש הקודם
          </div>
        )}
      </div>
      <div dir="ltr" style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150 }}>
        {months.map((m, i) => (
          <div
            key={m}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
              ${fmt(vals[i])}
            </div>
            <div
              title={`${monthLabel(m)}: $${fmt(vals[i])}`}
              style={{
                width: "68%",
                background: "var(--accent)",
                borderRadius: "6px 6px 0 0",
                height: `${(vals[i] / max) * 100}%`,
                minHeight: 2,
              }}
            />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              {monthLabel(m)}
              {m === partial ? " (חלקי)" : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
