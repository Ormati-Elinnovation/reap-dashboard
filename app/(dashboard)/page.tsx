"use client";
import { useMemo } from "react";
import { useTx } from "@/components/TransactionsProvider";
import SummaryCards from "@/components/SummaryCards";
import PivotTable from "@/components/PivotTable";
import MonthlyChart from "@/components/MonthlyChart";
import { buildPivot, monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";

export default function MainPage() {
  const { tx, months, partial } = useTx();
  const nMon = months.length || 1;
  const tot = tx.reduce((s, r) => s + r.amt, 0);
  const cos = new Set(tx.map((r) => r.company));
  const cards = new Set(tx.map((r) => r.card));
  const sups = new Set(tx.map((r) => r.merchant));
  const mTot = useMemo(() => monthTotals(tx, months), [tx, months]);
  const groups = useMemo(() => buildPivot(tx, "company", "card", ["holder"]), [tx]);

  return (
    <>
      <h3>🏠 סקירה כללית — הוצאות</h3>
      <SummaryCards
        cubes={[
          {
            lbl: "ממוצע חודשי",
            val: "$" + fmt(tot / nMon),
            accent: true,
            cnt: `${nMon} חודשים · סה"כ $${fmt(tot)} · ${tx.length} עסקאות`,
          },
          { lbl: "חברות", val: String(cos.size) },
          { lbl: "כרטיסים", val: String(cards.size) },
          { lbl: "ספקים", val: String(sups.size) },
        ]}
      />

      <MonthlyChart months={months} totals={mTot} partial={partial} />

      <h3>לפי חברה וכרטיס</h3>
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

      <p className="muted" style={{ marginTop: 18, fontSize: 12 }}>
        הערה: תצוגת ההפקדות וההיסטוריה מלפני מרץ 2026 אינה זמינה כרגע (מקור הנתונים המקורי נמחק);
        סקירה זו מציגה את ההוצאות מהדאטה שהוגר ל-Supabase. לכשיסופקו נתוני ההפקדות, טבלת <code>deposits</code> כבר קיימת לקליטתם.
      </p>
    </>
  );
}
