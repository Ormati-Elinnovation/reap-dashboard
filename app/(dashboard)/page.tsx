"use client";
import { useMemo } from "react";
import { useTx } from "@/components/TransactionsProvider";
import SummaryCards from "@/components/SummaryCards";
import PivotTable from "@/components/PivotTable";
import MonthlyChart from "@/components/MonthlyChart";
import { buildPivot, monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import type { Transaction } from "@/lib/types";

type Insight = { icon: string; text: string; tone?: "warn" | "good" | "info" };

function pct(a: number, b: number): number {
  return b > 0 ? ((a - b) / b) * 100 : 0;
}

function sumBy(rows: Transaction[], key: keyof Transaction): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "");
    m.set(k, (m.get(k) || 0) + r.amt);
  }
  return m;
}

function buildInsights(tx: Transaction[], months: string[], partial: string | null): Insight[] {
  const out: Insight[] = [];
  if (months.length < 2) return out;
  // Compare the last FULL month against the one before it (skip a partial month).
  const full = partial ? months.filter((m) => m !== partial) : months;
  if (full.length < 2) return out;
  const cur = full[full.length - 1];
  const prev = full[full.length - 2];
  const curRows = tx.filter((r) => r.month === cur);
  const prevRows = tx.filter((r) => r.month === prev);
  const curTot = curRows.reduce((s, r) => s + r.amt, 0);
  const prevTot = prevRows.reduce((s, r) => s + r.amt, 0);

  // 1. Total trend
  const d = pct(curTot, prevTot);
  if (Math.abs(d) >= 5)
    out.push({
      icon: d > 0 ? "📈" : "📉",
      tone: d > 0 ? "warn" : "good",
      text: `סה"כ ההוצאות ב${monthLabel(cur)} ${d > 0 ? "עלו" : "ירדו"} ב-${Math.abs(d).toFixed(0)}% לעומת ${monthLabel(prev)} ($${fmt(curTot)} מול $${fmt(prevTot)})`,
    });

  // 2. Biggest company movers
  const curCo = sumBy(curRows, "company");
  const prevCo = sumBy(prevRows, "company");
  let bestCo = "", bestDelta = 0;
  for (const [co, v] of curCo) {
    const delta = v - (prevCo.get(co) || 0);
    if (Math.abs(delta) > Math.abs(bestDelta)) { bestDelta = delta; bestCo = co; }
  }
  if (bestCo && Math.abs(bestDelta) > 500)
    out.push({
      icon: "🏛️",
      tone: bestDelta > 0 ? "warn" : "good",
      text: `${bestCo} היא החברה עם השינוי הגדול ביותר: ${bestDelta > 0 ? "+" : "−"}$${fmt(Math.abs(bestDelta))} לעומת ${monthLabel(prev)}`,
    });

  // 2b. Card insights — who spent most, biggest swing, concentration
  const cardMeta = (rows: Transaction[]) => {
    const spend = new Map<string, number>();
    const holder = new Map<string, string>();
    const company = new Map<string, string>();
    for (const r of rows) {
      const k = r.card || "ללא כרטיס";
      spend.set(k, (spend.get(k) || 0) + r.amt);
      if (r.holder) holder.set(k, r.holder);
      if (r.company) company.set(k, r.company);
    }
    return { spend, holder, company };
  };
  const curCard = cardMeta(curRows);
  const prevCard = cardMeta(prevRows);
  const cardRank = [...curCard.spend.entries()].sort((a, b) => b[1] - a[1]);
  const cardLabel = (id: string) => {
    const h = curCard.holder.get(id) || prevCard.holder.get(id);
    const co = curCard.company.get(id) || prevCard.company.get(id);
    const last4 = id.length >= 4 ? id.slice(-4) : id;
    const bits = [`••${last4}`];
    if (h) bits.push(h);
    if (co) bits.push(co);
    return bits.join(" · ");
  };
  if (cardRank.length && curTot > 0) {
    const [topId, topAmt] = cardRank[0];
    out.push({
      icon: "💳",
      tone: topAmt / curTot > 0.35 ? "warn" : "info",
      text: `הכרטיס שהוציא הכי הרבה ב${monthLabel(cur)}: ${cardLabel(topId)} — $${fmt(topAmt)} (${((topAmt / curTot) * 100).toFixed(0)}% מסך ההוצאות)`,
    });
    const top3 = cardRank.slice(0, 3).reduce((s, [, v]) => s + v, 0);
    if (cardRank.length >= 3 && top3 / curTot >= 0.7)
      out.push({
        icon: "🔢",
        tone: "info",
        text: `ריכוז כרטיסים: 3 הכרטיסים המובילים מהווים ${((top3 / curTot) * 100).toFixed(0)}% מהוצאות ${monthLabel(cur)}`,
      });
  }
  let bestCard = "", bestCardDelta = 0;
  const allCardIds = new Set([...curCard.spend.keys(), ...prevCard.spend.keys()]);
  for (const id of allCardIds) {
    const delta = (curCard.spend.get(id) || 0) - (prevCard.spend.get(id) || 0);
    if (Math.abs(delta) > Math.abs(bestCardDelta)) { bestCardDelta = delta; bestCard = id; }
  }
  if (bestCard && Math.abs(bestCardDelta) > 400)
    out.push({
      icon: bestCardDelta > 0 ? "📈" : "📉",
      tone: bestCardDelta > 0 ? "warn" : "good",
      text: `השינוי הכרטיסי החד ביותר: ${cardLabel(bestCard)} ${bestCardDelta > 0 ? "+" : "−"}$${fmt(Math.abs(bestCardDelta))} לעומת ${monthLabel(prev)}`,
    });
  const newCards = cardRank.filter(([id, v]) => v >= 200 && !prevCard.spend.has(id));
  for (const [id, v] of newCards.slice(0, 2))
    out.push({ icon: "🆕", tone: "info", text: `כרטיס פעיל חדש ב${monthLabel(cur)}: ${cardLabel(id)} — $${fmt(v)}` });
  const quietCards = [...prevCard.spend.entries()]
    .filter(([id, v]) => v >= 300 && !(curCard.spend.get(id) || 0))
    .sort((a, b) => b[1] - a[1]);
  for (const [id, v] of quietCards.slice(0, 1))
    out.push({
      icon: "🛑",
      tone: "info",
      text: `כרטיס שהיה פעיל ב${monthLabel(prev)} (הוציא $${fmt(v)}) לא הופיע ב${monthLabel(cur)}: ${cardLabel(id)}`,
    });

  // 3. Top supplier + concentration
  const curSup = [...sumBy(curRows, "merchant").entries()].sort((a, b) => b[1] - a[1]);
  if (curSup.length) {
    const [name, v] = curSup[0];
    out.push({ icon: "🏢", tone: "info", text: `הספק הגדול ביותר ב${monthLabel(cur)}: ${name} — $${fmt(v)} (${((v / curTot) * 100).toFixed(0)}% מסך ההוצאות)` });
    const top5 = curSup.slice(0, 5).reduce((s, [, v2]) => s + v2, 0);
    if (top5 / curTot > 0.6)
      out.push({ icon: "🎯", tone: "info", text: `ריכוזיות גבוהה: 5 הספקים המובילים מהווים ${((top5 / curTot) * 100).toFixed(0)}% מהוצאות ${monthLabel(cur)}` });
  }

  // 4. Suppliers that jumped sharply
  const prevSup = sumBy(prevRows, "merchant");
  const jumps: { name: string; from: number; to: number }[] = [];
  for (const [name, v] of curSup) {
    const p = prevSup.get(name) || 0;
    if (p >= 100 && v >= 500 && v / p >= 2) jumps.push({ name, from: p, to: v });
  }
  jumps.sort((a, b) => b.to - b.from - (a.to - a.from));
  for (const j of jumps.slice(0, 2))
    out.push({ icon: "⚡", tone: "warn", text: `${j.name} זינק פי ${(j.to / j.from).toFixed(1)}: $${fmt(j.from)} → $${fmt(j.to)}` });

  // 5. New significant suppliers
  const newSups = curSup.filter(([name, v]) => v >= 300 && !prevSup.has(name));
  for (const [name, v] of newSups.slice(0, 2))
    out.push({ icon: "🆕", tone: "info", text: `ספק חדש ב${monthLabel(cur)}: ${name} — $${fmt(v)}` });

  // 6. Largest single transaction
  const maxTx = curRows.reduce((a, r) => (r.amt > a.amt ? r : a), curRows[0]);
  if (maxTx && maxTx.amt > curTot * 0.08)
    out.push({ icon: "💥", tone: "info", text: `העסקה הגדולה ביותר: $${fmt(maxTx.amt)} — ${maxTx.merchant} (${maxTx.company}, ${maxTx.date})` });

  // 7. Refunds
  const refunds = curRows.filter((r) => r.amt < 0).reduce((s, r) => s + r.amt, 0);
  if (refunds < -100)
    out.push({ icon: "↩️", tone: "good", text: `זיכויים והחזרים ב${monthLabel(cur)}: $${fmt(Math.abs(refunds))}` });

  return out.slice(0, 10);
}

function HBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
        <span>{label}{sub ? <span className="muted"> · {sub}</span> : null}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>${fmt(value)}</span>
      </div>
      <div style={{ background: "var(--panel2)", borderRadius: 6, height: 8 }}>
        <div style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: "var(--accent)", height: 8, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function MainPage() {
  const { tx, months, partial } = useTx();
  const nMon = months.length || 1;
  const tot = tx.reduce((s, r) => s + r.amt, 0);
  const mTot = useMemo(() => monthTotals(tx, months), [tx, months]);
  const groups = useMemo(() => buildPivot(tx, "company", "card", ["holder"]), [tx]);
  const insights = useMemo(() => buildInsights(tx, months, partial), [tx, months, partial]);

  const last = months[months.length - 1];
  const prev = months.length > 1 ? months[months.length - 2] : null;
  const lastTot = last ? mTot[last] || 0 : 0;
  const prevTot = prev ? mTot[prev] || 0 : 0;
  const delta = prev ? pct(lastTot, prevTot) : 0;

  const lastRows = useMemo(() => tx.filter((r) => r.month === last), [tx, last]);
  const coTotals = useMemo(
    () => [...sumBy(lastRows, "company").entries()].sort((a, b) => b[1] - a[1]),
    [lastRows]
  );
  const supTotals = useMemo(
    () => [...sumBy(lastRows, "merchant").entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    [lastRows]
  );
  const cardTotals = useMemo(() => {
    const spend = new Map<string, { amt: number; holder: string; company: string }>();
    for (const r of lastRows) {
      const k = r.card || "ללא כרטיס";
      const cur = spend.get(k) || { amt: 0, holder: r.holder || "", company: r.company || "" };
      cur.amt += r.amt;
      if (r.holder) cur.holder = r.holder;
      if (r.company) cur.company = r.company;
      spend.set(k, cur);
    }
    return [...spend.entries()]
      .sort((a, b) => b[1].amt - a[1].amt)
      .slice(0, 8);
  }, [lastRows]);
  const coMax = Math.max(1, ...coTotals.map(([, v]) => v));
  const supMax = Math.max(1, ...supTotals.map(([, v]) => v));
  const cardMax = Math.max(1, ...cardTotals.map(([, v]) => v.amt));

  return (
    <>
      <h3 style={{ marginTop: 10 }}>🏠 מבט־על למנהל</h3>
      <SummaryCards
        cubes={[
          {
            lbl: last ? `${monthLabel(last)}${last === partial ? " (חלקי)" : ""}` : "החודש האחרון",
            val: "$" + fmt(lastTot),
            accent: true,
            cnt: prev
              ? `${delta > 0 ? "▲" : delta < 0 ? "▼" : "▬"} ${Math.abs(delta).toFixed(0)}% לעומת ${monthLabel(prev)}`
              : undefined,
          },
          { lbl: prev ? monthLabel(prev) : "חודש קודם", val: "$" + fmt(prevTot), cnt: prev ? `${tx.filter((r) => r.month === prev).length} עסקאות` : undefined },
          { lbl: "ממוצע חודשי", val: "$" + fmt(tot / nMon), cnt: `${nMon} חודשים · $${fmt(tot)} סה"כ` },
          { lbl: "עסקאות החודש", val: String(lastRows.length), cnt: `${new Set(lastRows.map((r) => r.merchant)).size} ספקים פעילים` },
          {
            lbl: "כרטיס מוביל",
            val: cardTotals[0] ? "$" + fmt(cardTotals[0][1].amt) : "—",
            cnt: cardTotals[0]
              ? `••${(cardTotals[0][0].length >= 4 ? cardTotals[0][0].slice(-4) : cardTotals[0][0])} · ${cardTotals[0][1].holder || cardTotals[0][1].company}`
              : undefined,
          },
        ]}
      />

      {insights.length > 0 && (
        <div className="card" style={{ margin: "12px 0" }}>
          <div className="lbl" style={{ marginBottom: 10 }}>💡 תובנות</div>
          {insights.map((ins, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 10, padding: "7px 0", fontSize: 13.5,
                borderTop: i ? "1px solid var(--line)" : undefined,
                color: ins.tone === "warn" ? "var(--exp)" : ins.tone === "good" ? "#3fb950" : "var(--txt)",
              }}
            >
              <span>{ins.icon}</span>
              <span style={{ color: "var(--txt)" }}>{ins.text}</span>
            </div>
          ))}
        </div>
      )}

      <MonthlyChart months={months} totals={mTot} partial={partial} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, margin: "12px 0" }}>
        <div className="card">
          <div className="lbl" style={{ marginBottom: 10 }}>
            🏛️ חברות — {last ? monthLabel(last) : ""}
          </div>
          {coTotals.map(([co, v]) => (
            <HBar key={co} label={co} value={v} max={coMax} />
          ))}
        </div>
        <div className="card">
          <div className="lbl" style={{ marginBottom: 10 }}>
            🏢 ספקים מובילים — {last ? monthLabel(last) : ""}
          </div>
          {supTotals.map(([s, v]) => (
            <HBar key={s} label={s} value={v} max={supMax} />
          ))}
        </div>
        <div className="card">
          <div className="lbl" style={{ marginBottom: 10 }}>
            💳 כרטיסים מובילים — {last ? monthLabel(last) : ""}
          </div>
          {cardTotals.map(([id, v]) => (
            <HBar
              key={id}
              label={`••${id.length >= 4 ? id.slice(-4) : id}${v.holder ? " · " + v.holder : ""}`}
              value={v.amt}
              max={cardMax}
              sub={v.company}
            />
          ))}
        </div>
      </div>

      <h3>לפי חברה וכרטיס</h3>
      <PivotTable
        groups={groups}
        months={months}
        partial={partial}
        nMon={nMon}
        firstCol="חברה / כרטיס"
        groupLabel={(g) => <strong>{g.key}</strong>}
        subLabel={(s) => (s.extra?.holder ? `${s.key} · ${s.extra.holder}` : s.key)}
      />
    </>
  );
}
