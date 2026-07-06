"use client";
import { useMemo, useState } from "react";
import { useTx } from "@/components/TransactionsProvider";
import SummaryCards from "@/components/SummaryCards";
import PivotTable from "@/components/PivotTable";
import DataTable from "@/components/DataTable";
import MonthlyChart from "@/components/MonthlyChart";
import { buildPivot, monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import type { Column } from "@/lib/filterEngine";
import type { Transaction } from "@/lib/types";

const COLS: Column[] = [
  { k: "date", t: "תאריך", type: "text" },
  { k: "company", t: "חברה", type: "select" },
  { k: "card", t: "כרטיס", type: "select" },
  { k: "holder", t: "מחזיק", type: "select" },
  { k: "merchant", t: "ספק", type: "select" },
  { k: "cat", t: "קטגוריה", type: "select" },
  { k: "month", t: "חודש", type: "select" },
  { k: "amt", t: "סכום $", type: "num" },
  { k: "status", t: "סטטוס", type: "select" },
];

export default function AllPage() {
  const { tx, months, partial } = useTx();
  const [filtered, setFiltered] = useState<Transaction[]>(tx);

  const nMon = useMemo(() => new Set(filtered.map((r) => r.month)).size || 1, [filtered]);
  const tot = useMemo(() => filtered.reduce((s, r) => s + r.amt, 0), [filtered]);
  const groups = useMemo(() => buildPivot(filtered, "company", "card", ["holder"]), [filtered]);

  const cos = new Set(filtered.map((r) => r.company));
  const cards = new Set(filtered.map((r) => r.card));
  const sups = new Set(filtered.map((r) => r.merchant));
  const big = filtered.length ? filtered.reduce((a, b) => (b.amt > a.amt ? b : a)) : null;

  return (
    <>
      <h3>📋 כל ההוצאות — כל הכרטיסים</h3>
      <SummaryCards
        cubes={[
          {
            lbl: "ממוצע חודשי",
            val: "$" + fmt(tot / nMon),
            accent: true,
            cnt: `${nMon} חודשים · סה"כ $${fmt(tot)} · ${filtered.length} עסקאות`,
          },
          { lbl: "חברות", val: String(cos.size), cnt: [...cos].join(", ").slice(0, 46) },
          { lbl: "כרטיסים", val: String(cards.size) },
          { lbl: "ספקים", val: String(sups.size) },
          {
            lbl: "עסקה גדולה",
            val: big ? "$" + fmt(big.amt) : "$0.00",
            cnt: big ? `${big.merchant} · ${big.card}` : "",
          },
        ]}
      />
      <MonthlyChart months={months} totals={monthTotals(filtered, months)} partial={partial} />
      <h3>חלוקה לפי חברה וכרטיס <span className="muted">— מתעדכן לפי הסינון</span></h3>
      <PivotTable
        groups={groups}
        months={months}
        partial={partial}
        nMon={nMon}
        firstCol="חברה / כרטיס"
        groupLabel={(g) => <b>{g.key}</b>}
        subLabel={(s) => (
          <>
            ↳ כרטיס {s.key} <span className="muted">({s.extra.holder})</span>
          </>
        )}
      />
      <h3>כל העסקאות</h3>
      <DataTable rows={tx} cols={COLS} exportName="all_expenses" cap={4000} onFilter={setFiltered} />
    </>
  );
}
