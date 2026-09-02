"use client";
import { useMemo, useState } from "react";
import { useTx } from "@/components/TransactionsProvider";
import SummaryCards from "@/components/SummaryCards";
import PivotTable from "@/components/PivotTable";
import MonthlyChart from "@/components/MonthlyChart";
import { buildPivot, monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import { COMPANY_ORDER } from "@/lib/types";
import { exportRows } from "@/lib/xlsx";
import { monthLabel } from "@/lib/months";

export default function CompaniesPage() {
  const { tx, months, partial } = useTx();
  const [co, setCo] = useState<string>("__all__");
  const nMon = months.length || 1;

  const companies = COMPANY_ORDER.filter((c) => tx.some((r) => r.company === c));
  const rows = co === "__all__" ? tx : tx.filter((r) => r.company === co);
  const tot = rows.reduce((s, r) => s + r.amt, 0);
  const mTot = useMemo(() => monthTotals(rows, months), [rows, months]);

  // Company → supplier breakdown (or supplier → card when a single company is chosen).
  const groups = useMemo(
    () =>
      co === "__all__"
        ? buildPivot(rows, "company", "merchant", [])
        : buildPivot(rows, "merchant", "card", ["holder"]),
    [rows, co]
  );

  function doExport() {
    const out: Record<string, unknown>[] = [];
    for (const g of groups) {
      const base: Record<string, unknown> = { [co === "__all__" ? "חברה" : "ספק"]: g.key };
      months.forEach((mo) => (base[monthLabel(mo)] = g.mon[mo] || 0));
      base['סה"כ'] = g.tot;
      out.push(base);
    }
    exportRows(out, "by-company", co === "__all__" ? "by-company.xlsx" : `company-${co}.xlsx`);
  }

  return (
    <>
      <h3>🏛️ פילוח לפי חברה</h3>
      <div className="tabs">
        {["__all__", ...companies].map((c) => (
          <button key={c} className={c === co ? "on" : ""} onClick={() => setCo(c)}>
            {c === "__all__" ? "הכל" : c}
          </button>
        ))}
      </div>

      <SummaryCards
        cubes={[
          { lbl: "ממוצע חודשי", val: "$" + fmt(tot / nMon), accent: true, cnt: `${rows.length} עסקאות` },
          { lbl: 'סה"כ', val: "$" + fmt(tot) },
          { lbl: "ספקים", val: String(new Set(rows.map((r) => r.merchant)).size) },
          { lbl: "כרטיסים", val: String(new Set(rows.map((r) => r.card)).size) },
        ]}
      />

      <MonthlyChart months={months} totals={mTot} partial={partial} />

      <div className="toolbar">
        <button className="btn" onClick={doExport}>⬇️ ייצוא לאקסל</button>
      </div>

      <PivotTable
        groups={groups}
        months={months}
        partial={partial}
        nMon={nMon}
        firstCol={co === "__all__" ? "חברה / ספק" : "ספק / כרטיס"}
        groupLabel={(g) => <strong>{g.key}</strong>}
        subLabel={(s) => (s.extra?.holder ? `${s.key} · ${s.extra.holder}` : s.key)}
      />
    </>
  );
}
