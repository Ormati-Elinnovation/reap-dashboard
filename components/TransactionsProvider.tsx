"use client";
import { createContext, useContext, useMemo } from "react";
import type { TechMap, Transaction } from "@/lib/types";
import { deriveMonths, partialMonth } from "@/lib/months";

type Ctx = {
  tx: Transaction[];
  techMap: TechMap;
  months: string[];
  partial: string | null;
};

const TxContext = createContext<Ctx | null>(null);

export function TransactionsProvider({
  tx,
  techMap,
  children,
}: {
  tx: Transaction[];
  techMap: TechMap;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(
    () => ({ tx, techMap, months: deriveMonths(tx), partial: partialMonth(tx) }),
    [tx, techMap]
  );
  return <TxContext.Provider value={value}>{children}</TxContext.Provider>;
}

export function useTx(): Ctx {
  const c = useContext(TxContext);
  if (!c) throw new Error("useTx must be used within TransactionsProvider");
  return c;
}
