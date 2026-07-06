import { create } from "zustand";

type BasketState = {
  inBasket: Set<string>; // cards in the basket (☑)
  offSup: Set<string>; // merchants excluded from totals
  openG: Set<string>; // expanded company groups in the "הכל" view
  view: string; // '__all__' or a company name
  initialized: boolean;

  init: (allCards: string[]) => void;
  setView: (v: string) => void;
  toggleCard: (c: string) => void;
  setCards: (cards: string[], on: boolean) => void;
  toggleGroup: (co: string) => void;
  setGroups: (cos: string[], open: boolean) => void;
  toggleSup: (m: string) => void;
  setSups: (ms: string[], off: boolean) => void;
};

export const useBasket = create<BasketState>((set) => ({
  inBasket: new Set(),
  offSup: new Set(),
  openG: new Set(),
  view: "__all__",
  initialized: false,

  init: (allCards) =>
    set((s) => (s.initialized ? s : { inBasket: new Set(allCards), initialized: true })),
  setView: (v) => set({ view: v }),
  toggleCard: (c) =>
    set((s) => {
      const n = new Set(s.inBasket);
      n.has(c) ? n.delete(c) : n.add(c);
      return { inBasket: n };
    }),
  setCards: (cards, on) =>
    set((s) => {
      const n = new Set(s.inBasket);
      cards.forEach((c) => (on ? n.add(c) : n.delete(c)));
      return { inBasket: n };
    }),
  toggleGroup: (co) =>
    set((s) => {
      const n = new Set(s.openG);
      n.has(co) ? n.delete(co) : n.add(co);
      return { openG: n };
    }),
  setGroups: (cos, open) =>
    set((s) => {
      const n = new Set(s.openG);
      cos.forEach((c) => (open ? n.add(c) : n.delete(c)));
      return { openG: n };
    }),
  toggleSup: (m) =>
    set((s) => {
      const n = new Set(s.offSup);
      n.has(m) ? n.delete(m) : n.add(m);
      return { offSup: n };
    }),
  setSups: (ms, off) =>
    set((s) => {
      const n = new Set(s.offSup);
      ms.forEach((m) => (off ? n.add(m) : n.delete(m)));
      return { offSup: n };
    }),
}));
