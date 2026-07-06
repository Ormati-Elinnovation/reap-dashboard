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
  { k: "tech_group", t: "קבוצה", type: "select" },
  { k: "tech_supplier", t: "ספק", type: "select" },
  { k: "company", t: "חברה", type: "select" },
  { k: "card", t: "כרטיס", type: "select" },
  { k: "holder", t: "מחזיק", type: "select" },
  { k: "merchant", t: "תיאור", type: "select" },
  { k: "month", t: "חודש", type: "select" },
  { k: "amt", t: "סכום $", type: "num" },
  { k: "status", t: "סטטוס", type: "select" },
];

export default function TechnologyPage() {
  const { tx, months, partial } = useTx();
  const techRows = useMemo(() => tx.filter((r) => r.tech_group), [tx]);
  const [filtered, setFiltered] = useState<Transaction[]>(techRows);

  const nMon = useMemo(() => new Set(filtered.map((r) => r.month)).size || 1, [filtered]);
  const tot = filtered.reduce((s, r) => s + r.amt, 0);
  const ai = filtered.filter((r) => r.tech_group === "AI/API infra").reduce((s, r) => s + r.amt, 0);
  const sups = new Set(filtered.map((r) => r.tech_supplier));
  const big = filtered.length ? filtered.reduce((a, b) => (b.amt > a.amt ? b : a)) : null;
  const groups = useMemo(() => buildPivot(filtered, "tech_group", "tech_supplier", []), [filtered]);

  return (
    <>
      <h3>🖥️ Technology Expenses</h3>
      <SummaryCards
        cubes={[
          {
            lbl: "ממוצע חודשי",
            val: "$" + fmt(tot / nMon),
            accent: true,
            cnt: `${nMon} חודשים · סה"כ $${fmt(tot)} · ${filtered.length} עסקאות`,
          },
          { lbl: "AI / API infra", val: "$" + fmt(ai), cnt: `ממוצע $${fmt(ai / nMon)}/חודש` },
          { lbl: "Core (ללא AI)", val: "$" + fmt(tot - ai), cnt: `ממוצע $${fmt((tot - ai) / nMon)}/חודש` },
          { lbl: "ספקים", val: String(sups.size) },
          {
            lbl: "עסקה גדולה",
            val: big ? "$" + fmt(big.amt) : "$0.00",
            cnt: big ? `${big.tech_supplier} · ${big.card}` : "",
          },
        ]}
      />
      <MonthlyChart months={months} totals={monthTotals(filtered, months)} partial={partial} />
      <h3>חלוקה לפי קבוצה וספק <span className="muted">— מתעדכן לפי הסינון</span></h3>
      <PivotTable
        groups={groups}
        months={months}
        partial={partial}
        nMon={nMon}
        firstCol="קבוצה / ספק"
        groupLabel={(g) => <b>{g.key}</b>}
        subLabel={(s) => <>↳ {s.key}</>}
      />
      <h3>כל העסקאות</h3>
      <DataTable rows={techRows} cols={COLS} exportName="technology" onFilter={setFiltered} />
    </>
  );
}
