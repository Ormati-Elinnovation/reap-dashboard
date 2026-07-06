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
  { k: "srv_group", t: "ספק", type: "select" },
  { k: "company", t: "חברה", type: "select" },
  { k: "card", t: "כרטיס", type: "select" },
  { k: "holder", t: "מחזיק", type: "select" },
  { k: "merchant", t: "תיאור", type: "select" },
  { k: "month", t: "חודש", type: "select" },
  { k: "amt", t: "סכום $", type: "num" },
  { k: "status", t: "סטטוס", type: "select" },
];

export default function ServersPage() {
  const { tx, months, partial } = useTx();
  const serverRows = useMemo(() => tx.filter((r) => r.srv_group), [tx]);
  const [filtered, setFiltered] = useState<Transaction[]>(serverRows);

  const nMon = useMemo(() => new Set(filtered.map((r) => r.month)).size || 1, [filtered]);
  const tot = filtered.reduce((s, r) => s + r.amt, 0);
  const bygrp = (g: string) => filtered.filter((r) => r.srv_group === g).reduce((s, r) => s + r.amt, 0);
  const big = filtered.length ? filtered.reduce((a, b) => (b.amt > a.amt ? b : a)) : null;
  const groups = useMemo(() => buildPivot(filtered, "srv_group", "card", ["holder", "company"]), [filtered]);

  return (
    <>
      <h3>☁️ שרתים — AWS + AUTOMAT + MongoDB</h3>
      <SummaryCards
        cubes={[
          {
            lbl: "ממוצע חודשי",
            val: "$" + fmt(tot / nMon),
            accent: true,
            cnt: `${nMon} חודשים · סה"כ $${fmt(tot)} · ${filtered.length} עסקאות`,
          },
          { lbl: "AWS", val: "$" + fmt(bygrp("AWS")), cnt: `ממוצע $${fmt(bygrp("AWS") / nMon)}/חודש` },
          { lbl: "AUTOMAT", val: "$" + fmt(bygrp("AUTOMAT")), cnt: `ממוצע $${fmt(bygrp("AUTOMAT") / nMon)}/חודש` },
          { lbl: "MongoDB", val: "$" + fmt(bygrp("MongoDB")), cnt: `ממוצע $${fmt(bygrp("MongoDB") / nMon)}/חודש` },
          {
            lbl: "עסקה גדולה",
            val: big ? "$" + fmt(big.amt) : "$0.00",
            cnt: big ? `${big.srv_group} · כרטיס ${big.card}` : "",
          },
        ]}
      />
      <MonthlyChart months={months} totals={monthTotals(filtered, months)} partial={partial} />
      <h3>חלוקה לפי ספק וכרטיס <span className="muted">— מתעדכן לפי הסינון</span></h3>
      <PivotTable
        groups={groups}
        months={months}
        partial={partial}
        nMon={nMon}
        firstCol="ספק / כרטיס"
        groupLabel={(g) => <b>{g.key}</b>}
        subLabel={(s) => (
          <>
            ↳ כרטיס {s.key} <span className="muted">({s.extra.holder} · {s.extra.company})</span>
          </>
        )}
      />
      <h3>כל העסקאות</h3>
      <DataTable rows={serverRows} cols={COLS} exportName="servers" onFilter={setFiltered} />
    </>
  );
}
