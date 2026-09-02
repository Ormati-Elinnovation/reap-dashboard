"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { TechMap, Transaction } from "@/lib/types";
import { deriveMonths, partialMonth } from "@/lib/months";
import { cachedData, loadData, onReload, type Loaded } from "@/lib/dataStore";
import { cardHolder } from "@/lib/cardAliases";

type Ctx = {
  tx: Transaction[];
  techMap: TechMap;
  months: string[];
  partial: string | null;
  isAdmin: boolean;
};

const TxContext = createContext<Ctx | null>(null);

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      {children}
    </div>
  );
}

export function TransactionsProvider({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  const [data, setData] = useState<Loaded | null>(() => cachedData());
  const [err, setErr] = useState<string | null>(null);

  const fetchNow = useCallback(() => {
    setErr(null);
    loadData()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!data) fetchNow();
    // On manual refresh: refetch in place (keep current data visible, no blank flash).
    return onReload(() => fetchNow());
  }, [data, fetchNow]);

  const value = useMemo<Ctx | null>(
    () =>
      data
        ? {
            tx: data.tx.map((r) => ({ ...r, holder: cardHolder(r.card, r.holder) || r.holder })),
            techMap: data.techMap,
            months: deriveMonths(data.tx),
            partial: partialMonth(data.tx),
            isAdmin,
          }
        : null,
    [data, isAdmin]
  );

  if (err) return <Panel><div className="lbl">שגיאה בטעינת הנתונים</div><p className="muted" style={{ fontSize: 12 }}>{err}</p></Panel>;
  if (!value) return <Panel><div className="lbl">טוען נתונים…</div></Panel>;
  if (value.tx.length === 0)
    return (
      <Panel>
        <div className="lbl">{isAdmin ? "אין נתונים" : "אין הרשאות צפייה"}</div>
        <p className="sub" style={{ marginTop: 8 }}>
          {isAdmin
            ? "לא נמצאו עסקאות. ודא שהנתונים נטענו (npm run seed:reset)."
            : "המשתמש שלך עדיין לא קיבל הרשאות צפייה לחברות/כרטיסים. פנה למנהל המערכת."}
        </p>
      </Panel>
    );

  return <TxContext.Provider value={value}>{children}</TxContext.Provider>;
}

export function useTx(): Ctx {
  const c = useContext(TxContext);
  if (!c) throw new Error("useTx must be used within TransactionsProvider");
  return c;
}
