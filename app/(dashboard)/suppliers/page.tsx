"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTx } from "@/components/TransactionsProvider";
import EntityLink from "@/components/EntityLink";
import { useBasket } from "@/lib/store";
import { COMPANY_ORDER } from "@/lib/types";
import CompanyTabs from "@/components/CompanyTabs";
import CardBasketChips, { type CardMeta } from "@/components/CardBasketChips";
import PivotTable from "@/components/PivotTable";
import MonthlyChart from "@/components/MonthlyChart";
import { buildPivot, monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { exportRows } from "@/lib/xlsx";

export default function SuppliersPage() {
  const { tx, months, partial } = useTx();
  const { view, inBasket, offSup, init, toggleSup, setSups } = useBasket();
  const params = useSearchParams();
  const [q, setQ] = useState(() => params.get("merchant") || "");

  const meta = useMemo<CardMeta[]>(() => {
    const m = new Map<string, CardMeta>();
    for (const r of tx) {
      const e = m.get(r.card) ?? { card: r.card, holder: r.holder, company: r.company, tot: 0 };
      e.tot += r.amt;
      m.set(r.card, e);
    }
    return [...m.values()].sort((a, b) => b.tot - a.tot);
  }, [tx]);

  useEffect(() => {
    init(meta.map((m) => m.card));
  }, [meta, init]);

  const companies = COMPANY_ORDER.filter((c) => meta.some((m) => m.company === c));
  const nMon = months.length || 1;

  function scopeTot(co: string) {
    return tx
      .filter((r) => inBasket.has(r.card) && (co === "__all__" || r.company === co) && !offSup.has(r.merchant))
      .reduce((s, r) => s + r.amt, 0);
  }

  const baseRows = tx.filter((r) => inBasket.has(r.card) && (view === "__all__" || r.company === view));
  const allGroups = useMemo(
    () => buildPivot(baseRows, "merchant", "card", ["holder", "company"]),
    [baseRows]
  );
  const groups = q
    ? allGroups.filter((g) => g.key.toLowerCase().includes(q.toLowerCase()))
    : allGroups;
  const includedRows = baseRows.filter((r) => !offSup.has(r.merchant));

  function doExport() {
    const out: Record<string, unknown>[] = [];
    for (const g of groups) {
      if (offSup.has(g.key)) continue;
      const base: Record<string, unknown> = { ספק: g.key, כרטיס: "הכל" };
      months.forEach((mo) => (base[monthLabel(mo)] = g.mon[mo] || 0));
      base['סה"כ'] = g.tot;
      base["ממוצע חודשי"] = g.tot / nMon;
      base["עסקאות"] = g.n;
      out.push(base);
      for (const s of g.subs) {
        const o: Record<string, unknown> = { ספק: g.key, כרטיס: `${s.key} (${s.extra.holder})` };
        months.forEach((mo) => (o[monthLabel(mo)] = s.mon[mo] || 0));
        o['סה"כ'] = s.tot;
        o["ממוצע חודשי"] = s.tot / nMon;
        o["עסקאות"] = s.n;
        out.push(o);
      }
    }
    exportRows(out, "suppliers", "reap_suppliers_monthly.xlsx");
  }

  return (
    <>
      <h3>🏢 הוצאות חודשיות לפי ספקים</h3>
      <CompanyTabs companies={companies} scopeTot={scopeTot} />
      <CardBasketChips meta={meta} companies={companies} />
      <MonthlyChart months={months} totals={monthTotals(includedRows, months)} partial={partial} />
      <div className="toolbar">
        <input
          className="search"
          placeholder="🔎 חיפוש ספק..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" onClick={() => setSups(allGroups.map((g) => g.key), false)}>
          ☑ הדלק הכל
        </button>
        <button className="btn" onClick={() => setSups(allGroups.map((g) => g.key), true)}>
          ☐ כבה הכל
        </button>
        <button className="btn primary" onClick={doExport}>
          ⬇️ ייצוא לאקסל
        </button>
      </div>
      <PivotTable
        groups={groups}
        months={months}
        partial={partial}
        nMon={nMon}
        firstCol="ספק"
        exclude={{ off: offSup, onToggle: toggleSup }}
        groupLabel={(g) => <EntityLink kind="merchant" value={g.key}>{g.key}</EntityLink>}
        subLabel={(s) => (
          <>
            ↳ <EntityLink kind="card" value={s.key}>כרטיס {s.key}</EntityLink>{" "}
            <span className="muted">(
              {s.extra.holder} · <EntityLink kind="company" value={s.extra.company}>{s.extra.company}</EntityLink>
            )</span>
          </>
        )}
      />
    </>
  );
}
