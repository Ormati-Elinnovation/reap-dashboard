"use client";
import { useMemo, useState } from "react";
import { useTx } from "@/components/TransactionsProvider";
import SummaryCards from "@/components/SummaryCards";
import PivotTable from "@/components/PivotTable";
import MonthlyChart from "@/components/MonthlyChart";
import { buildPivot, monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import { exportRows } from "@/lib/xlsx";
import { monthLabel } from "@/lib/months";
import type { Transaction } from "@/lib/types";

// Expense-type view: classify every transaction into a business category.
// Priority: manual department → tech classification → Reap category mapping.
const CAT_MAP: Record<string, string> = {
  Software: "טכנולוגיה",
  "Computer Services": "טכנולוגיה",
  Advertising: "שיווק ופרסום",
  Marketing: "שיווק ופרסום",
  Travel: "נסיעות ותיירות",
  Airlines: "נסיעות ותיירות",
  Hotels: "נסיעות ותיירות",
  Lodging: "נסיעות ותיירות",
  Transportation: "נסיעות ותיירות",
  Restaurants: "אוכל ואירוח",
  Food: "אוכל ואירוח",
  Groceries: "אוכל ואירוח",
  Insurance: "מנהלה",
  "Professional Services": "שירותים מקצועיים",
  Legal: "שירותים מקצועיים",
  Accounting: "שירותים מקצועיים",
  Education: "הדרכה ולמידה",
  Telecom: "תקשורת",
  Utilities: "מנהלה",
  "Office Supplies": "מנהלה",
  Retail: "רכש כללי",
  Others: "אחר",
};

function classify(r: Transaction): string {
  if (r.department) return r.department;
  if (r.tech_group || r.srv_group) return "טכנולוגיה";
  if (r.cat && CAT_MAP[r.cat]) return CAT_MAP[r.cat];
  if (r.cat) return r.cat; // keep original Reap category when unmapped
  return "לא מסווג";
}

export default function CategoriesPage() {
  const { tx, months, partial } = useTx();
  const [sel, setSel] = useState<string>("__all__");
  const nMon = months.length || 1;

  const withCat = useMemo(() => tx.map((r) => ({ ...r, _bizcat: classify(r) })), [tx]);
  const cats = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of withCat) totals.set(r._bizcat, (totals.get(r._bizcat) || 0) + r.amt);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [withCat]);

  const rows = sel === "__all__" ? withCat : withCat.filter((r) => r._bizcat === sel);
  const tot = rows.reduce((s, r) => s + r.amt, 0);
  const mTot = useMemo(() => monthTotals(rows, months), [rows, months]);

  const groups = useMemo(() => {
    if (sel === "__all__") {
      // category → supplier
      const base = rows.map((r) => ({ ...r, merchant: r.merchant, cat: r._bizcat }));
      return buildPivot(base as Transaction[], "cat", "merchant", []);
    }
    // supplier → company inside the chosen category
    return buildPivot(rows as Transaction[], "merchant", "company", []);
  }, [rows, sel]);

  function doExport() {
    const out: Record<string, unknown>[] = [];
    for (const g of groups) {
      const base: Record<string, unknown> = { [sel === "__all__" ? "סוג הוצאה" : "ספק"]: g.key };
      months.forEach((mo) => (base[monthLabel(mo)] = g.mon[mo] || 0));
      base['סה"כ'] = g.tot;
      out.push(base);
    }
    exportRows(out, "by-category", "by-category.xlsx");
  }

  return (
    <>
      <h3>🗂️ פילוח לפי סוג הוצאה</h3>
      <p className="sub">
        טכנולוגיה, נסיעות, שיווק, מנהלה ועוד — לפי קטגוריות Reap, סיווגי טכנולוגיה ומחלקות ידניות. שום נתון לא הוסר: עסקאות ללא סיווג מוצגות תחת &quot;לא מסווג&quot;.
      </p>

      <div className="tabs">
        {["__all__", ...cats].map((c) => (
          <button key={c} className={c === sel ? "on" : ""} onClick={() => setSel(c)}>
            {c === "__all__" ? "הכל" : c}
          </button>
        ))}
      </div>

      <SummaryCards
        cubes={[
          { lbl: "ממוצע חודשי", val: "$" + fmt(tot / nMon), accent: true, cnt: `${rows.length} עסקאות` },
          { lbl: 'סה"כ', val: "$" + fmt(tot) },
          { lbl: "סוגי הוצאה", val: String(sel === "__all__" ? cats.length : 1) },
          { lbl: "ספקים", val: String(new Set(rows.map((r) => r.merchant)).size) },
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
        firstCol={sel === "__all__" ? "סוג הוצאה / ספק" : "ספק / חברה"}
        groupLabel={(g) => <strong>{g.key}</strong>}
        subLabel={(s) => s.key}
      />
    </>
  );
}
