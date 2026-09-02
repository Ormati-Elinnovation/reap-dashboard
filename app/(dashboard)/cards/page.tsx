"use client";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTx } from "@/components/TransactionsProvider";
import { useBasket } from "@/lib/store";
import { COMPANY_ORDER } from "@/lib/types";
import SummaryCards from "@/components/SummaryCards";
import CompanyTabs from "@/components/CompanyTabs";
import CardBasketChips, { type CardMeta } from "@/components/CardBasketChips";
import DataTable from "@/components/DataTable";
import MonthlyChart from "@/components/MonthlyChart";
import { monthTotals } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import type { Column } from "@/lib/filterEngine";

const COLS: Column[] = [
  { k: "date", t: "תאריך", type: "text" },
  { k: "company", t: "חברה", type: "select" },
  { k: "card", t: "כרטיס", type: "select" },
  { k: "merchant", t: "ספק", type: "select" },
  { k: "cat", t: "קטגוריה", type: "select" },
  { k: "month", t: "חודש", type: "select" },
  { k: "amt", t: "סכום $", type: "num" },
  { k: "status", t: "סטטוס", type: "select" },
];

export default function CardsPage() {
  const { tx, months, partial } = useTx();
  const { view, inBasket, offSup, init, toggleSup, setSups, setCards } = useBasket();
  const params = useSearchParams();
  const focusCard = params.get("card");
  const focusHolder = params.get("holder");

  const meta = useMemo<CardMeta[]>(() => {
    const m = new Map<string, CardMeta & { _t: number }>();
    for (const r of tx) {
      const e = m.get(r.card) ?? { card: r.card, holder: r.holder, company: r.company, tot: 0, _t: 0 };
      e.tot += r.amt;
      m.set(r.card, e);
    }
    return [...m.values()].sort((a, b) => b.tot - a.tot);
  }, [tx]);

  useEffect(() => {
    init(meta.map((m) => m.card));
  }, [meta, init]);

  useEffect(() => {
    if (!meta.length) return;
    const all = meta.map((m) => m.card);
    if (focusCard) {
      const hit = meta.find((m) => m.card === focusCard || m.card.endsWith(focusCard));
      if (hit) {
        setCards(all, false);
        setCards([hit.card], true);
      }
    } else if (focusHolder) {
      const hits = meta.filter((m) => m.holder.toLowerCase() === focusHolder.toLowerCase());
      if (hits.length) {
        setCards(all, false);
        setCards(hits.map((h) => h.card), true);
      }
    }
  }, [focusCard, focusHolder, meta, setCards]);

  const companies = COMPANY_ORDER.filter((c) => meta.some((m) => m.company === c));

  function scopeTot(co: string) {
    return tx
      .filter((r) => inBasket.has(r.card) && (co === "__all__" || r.company === co) && !offSup.has(r.merchant))
      .reduce((s, r) => s + r.amt, 0);
  }
  const baseRows = tx.filter((r) => inBasket.has(r.card) && (view === "__all__" || r.company === view));
  const basket = baseRows.filter((r) => !offSup.has(r.merchant));

  // by-supplier aggregation (basket scope, pre column-filter)
  const bym = useMemo(() => {
    const m = new Map<string, { s: number; n: number; cards: Set<string> }>();
    for (const r of baseRows) {
      const o = m.get(r.merchant) ?? { s: 0, n: 0, cards: new Set<string>() };
      o.s += r.amt;
      o.n += 1;
      o.cards.add(r.card);
      m.set(r.merchant, o);
    }
    return [...m.entries()].sort((a, b) => b[1].s - a[1].s);
  }, [baseRows]);
  const inbEntries = bym.filter(([mch]) => !offSup.has(mch));
  const bmSum = inbEntries.reduce((a, [, o]) => a + o.s, 0);

  const tot = basket.reduce((s, r) => s + r.amt, 0);
  const nMon = new Set(basket.map((r) => r.month)).size || 1;
  const cos = new Set(basket.map((r) => r.company));
  const cards = new Set(basket.map((r) => r.card));
  const sups = new Set(basket.map((r) => r.merchant));
  const big = basket.length ? basket.reduce((a, b) => (b.amt > a.amt ? b : a)) : null;

  return (
    <>
      <h3>💳 כרטיסים — בניית סל חוצה-ישויות</h3>
      <CompanyTabs companies={companies} scopeTot={scopeTot} />
      <CardBasketChips meta={meta} companies={companies} />
      <SummaryCards
        cubes={[
          {
            lbl: "ממוצע חודשי (סל)",
            val: "$" + fmt(tot / nMon),
            accent: true,
            cnt: `${nMon} חודשים · סה"כ $${fmt(tot)} · ${basket.length} עסקאות`,
          },
          { lbl: "חברות · כרטיסים", val: `${cos.size} · ${cards.size}`, cnt: [...cos].join(", ").slice(0, 40) },
          { lbl: "ספקים בסל", val: String(sups.size), cnt: offSup.size ? `${offSup.size} מוחרגים` : "ללא החרגות" },
          { lbl: "עסקה גדולה", val: big ? "$" + fmt(big.amt) : "$0.00", cnt: big ? `${big.merchant} · ${big.card}` : "" },
        ]}
      />
      <MonthlyChart months={months} totals={monthTotals(basket, months)} partial={partial} title="הוצאות חודשיות של הסל" />

      <h3>לפי ספקים <span className="muted">— לחץ שורה לכבות/להפעיל ספק בסל</span></h3>
      <div className="toolbar">
        <button className="btn" onClick={() => setSups([...bym.map(([m]) => m)], false)}>
          ☑ הדלק הכל
        </button>
        <button className="btn" onClick={() => setSups([...bym.map(([m]) => m)], true)}>
          ☐ כבה הכל
        </button>
        <span className="muted">
          {bym.length} ספקים · {inbEntries.length} בסל
          {offSup.size ? ` · ${offSup.size} מוחרגים` : ""}
        </span>
      </div>
      <div className="tablewrap" style={{ maxHeight: "42vh" }}>
        <table>
          <thead>
            <tr>
              <th>ספק</th>
              <th style={{ textAlign: "right" }}>עסקאות</th>
              <th style={{ textAlign: "right" }}>כרטיסים</th>
              <th style={{ textAlign: "right" }}>סה&quot;כ $</th>
              <th>מצב</th>
            </tr>
          </thead>
          <tbody>
            {bym.slice(0, 150).map(([mch, o]) => {
              const off = offSup.has(mch);
              return (
                <tr key={mch} className={"srow" + (off ? " off" : "")} onClick={() => toggleSup(mch)}>
                  <td>{mch}</td>
                  <td style={{ textAlign: "right" }}>{o.n}</td>
                  <td style={{ textAlign: "right" }}>{o.cards.size}</td>
                  <td style={{ textAlign: "right" }}>${fmt(o.s)}</td>
                  <td>{off ? <span className="pill">מוחרג</span> : "☑ בסל"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>סה&quot;כ בסל ({inbEntries.length} ספקים)</td>
              <td></td>
              <td></td>
              <td style={{ textAlign: "right" }}>${fmt(bmSum)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h3>כל העסקאות <span className="muted">— הרשימה המותאמת</span></h3>
      <DataTable rows={basket} cols={COLS} exportName="custom_basket" />
    </>
  );
}
