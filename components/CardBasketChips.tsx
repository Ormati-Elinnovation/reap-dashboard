"use client";
import { useBasket } from "@/lib/store";
import { fmt } from "@/lib/format";

export type CardMeta = { card: string; holder: string; company: string; tot: number };

export default function CardBasketChips({
  meta,
  companies,
}: {
  meta: CardMeta[];
  companies: string[];
}) {
  const { view, inBasket, openG, offSup, toggleCard, setCards, toggleGroup } = useBasket();

  const byCompany = (co: string) =>
    meta.filter((m) => m.company === co).sort((a, b) => b.tot - a.tot);
  const groups = view === "__all__" ? companies : [view];
  const viewCards = view === "__all__" ? meta : meta.filter((m) => m.company === view);
  const selN = viewCards.filter((m) => inBasket.has(m.card)).length;

  return (
    <>
      <div className="chipbar">
        {groups.map((co) => {
          const cc = byCompany(co);
          if (!cc.length) return null;
          const opened = view !== "__all__" || openG.has(co);
          const allIn = cc.every((m) => inBasket.has(m.card));
          const nIn = cc.filter((m) => inBasket.has(m.card)).length;
          return (
            <div key={co} style={{ display: "contents" }}>
              {view === "__all__" && (
                <div className={"ghead" + (opened ? " open" : "")} onClick={() => toggleGroup(co)}>
                  <span className="tg">{opened ? "▼" : "▶"}</span> {co}{" "}
                  <span className="muted">
                    ({nIn}/{cc.length})
                  </span>{" "}
                  <span
                    className="ck"
                    title="בחר/נקה את כל כרטיסי החברה"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCards(
                        cc.map((m) => m.card),
                        !allIn
                      );
                    }}
                  >
                    {allIn ? "☑" : "☐"}
                  </span>
                </div>
              )}
              {opened &&
                cc.map((m) => (
                  <button
                    key={m.card}
                    className={"chip" + (inBasket.has(m.card) ? "" : " off")}
                    onClick={() => toggleCard(m.card)}
                  >
                    <span className="ck">{inBasket.has(m.card) ? "☑" : "☐"}</span>
                    {m.card} <span className="s">{m.holder} · ${fmt(m.tot)}</span>
                  </button>
                ))}
            </div>
          );
        })}
        <div style={{ width: "100%", marginTop: 4 }}>
          {view === "__all__" && (
            <>
              <button
                className="mini"
                onClick={() => useBasket.getState().setGroups(companies, true)}
              >
                פתח הכל
              </button>
              <button
                className="mini"
                style={{ marginRight: 6 }}
                onClick={() => useBasket.getState().setGroups(companies, false)}
              >
                סגור הכל
              </button>
            </>
          )}
          <button
            className="mini"
            style={{ marginRight: 6 }}
            onClick={() => setCards(viewCards.map((m) => m.card), true)}
          >
            בחר הכל
          </button>
          <button
            className="mini"
            style={{ marginRight: 6 }}
            onClick={() => setCards(viewCards.map((m) => m.card), false)}
          >
            נקה
          </button>
        </div>
      </div>
      <div className="chipnote">
        {view === "__all__" ? "כל החברות" : view} · {selN} כרטיסים בסל
        {offSup.size ? ` · ${offSup.size} ספקים מוחרגים` : ""} · ☑ = הכרטיס בסל (נשמר בין הטאבים)
      </div>
    </>
  );
}
