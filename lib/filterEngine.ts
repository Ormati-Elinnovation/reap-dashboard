export type ColType = "text" | "select" | "num";
export type Column = { k: string; t: string; type?: ColType };

export type FilterState = {
  q: string;
  sel: Record<string, string[]>; // multi-select: chosen values per column (empty/absent = no filter)
  txt: Record<string, string>;
  num: Record<string, { min?: number; max?: number }>;
};

export function emptyFilters(): FilterState {
  return { q: "", sel: {}, txt: {}, num: {} };
}

// Port of build_tabs.py filtered(): free-text search + per-column select/text/numeric filters + sort.
export function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  cols: Column[],
  f: FilterState,
  sortK: string,
  sortDir: number
): T[] {
  const q = f.q.toLowerCase().trim();
  const out = rows.filter((r) => {
    if (q && !cols.some((c) => String(r[c.k] ?? "").toLowerCase().includes(q))) return false;
    for (const k in f.sel) {
      const vals = f.sel[k];
      if (vals && vals.length && !vals.includes(String(r[k] ?? ""))) return false;
    }
    for (const k in f.txt) if (!String(r[k] ?? "").toLowerCase().includes(f.txt[k])) return false;
    for (const k in f.num) {
      const v = r[k] as number;
      const { min, max } = f.num[k];
      if (min != null && v < min) return false;
      if (max != null && v > max) return false;
    }
    return true;
  });
  out.sort((a, b) => {
    const x = a[sortK] as unknown;
    const y = b[sortK] as unknown;
    if (typeof x === "number" && typeof y === "number") return (x - y) * sortDir;
    return String(x).localeCompare(String(y)) * sortDir;
  });
  return out;
}

// Unique sorted values for a select-filter dropdown.
export function optionsFor<T extends Record<string, unknown>>(rows: T[], key: string): string[] {
  return Array.from(new Set(rows.map((r) => String(r[key] ?? "")))).sort();
}
