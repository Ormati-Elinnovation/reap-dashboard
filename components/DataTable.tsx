"use client";
import { useEffect, useMemo, useState } from "react";
import { applyFilters, emptyFilters, optionsFor, type Column, type FilterState } from "@/lib/filterEngine";
import { fmt } from "@/lib/format";
import { exportRows } from "@/lib/xlsx";

type Row = Record<string, unknown> & { amt: number };

export default function DataTable<T extends Row>({
  rows,
  cols,
  exportName,
  cap,
  onFilter,
}: {
  rows: T[];
  cols: Column[];
  exportName: string;
  cap?: number;
  onFilter?: (rows: T[]) => void;
}) {
  const [f, setF] = useState<FilterState>(emptyFilters());
  const [sortK, setSortK] = useState<string>("date");
  const [sortDir, setSortDir] = useState<number>(-1);

  const options = useMemo(() => {
    const o: Record<string, string[]> = {};
    for (const c of cols) if (c.type === "select") o[c.k] = optionsFor(rows, c.k);
    return o;
  }, [rows, cols]);

  const filtered = useMemo(
    () => applyFilters(rows, cols, f, sortK, sortDir),
    [rows, cols, f, sortK, sortDir]
  );
  const sum = useMemo(() => filtered.reduce((s, r) => s + r.amt, 0), [filtered]);
  const shown = cap ? filtered.slice(0, cap) : filtered;

  useEffect(() => {
    onFilter?.(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  function sortBy(k: string) {
    if (sortK === k) setSortDir((d) => -d);
    else {
      setSortK(k);
      setSortDir(1);
    }
  }
  function clearAll() {
    setF(emptyFilters());
  }
  function doExport() {
    const out = filtered.map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of cols) o[c.t] = r[c.k];
      return o;
    });
    exportRows(out, exportName, `reap_${exportName}.xlsx`);
  }

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          placeholder="🔎 חיפוש חופשי בכל העמודות..."
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
        />
        <button className="btn" onClick={clearAll}>
          נקה סינון
        </button>
        <button className="btn primary" onClick={doExport}>
          ⬇️ ייצוא לאקסל
        </button>
        <span className="muted">
          {filtered.length} מתוך {rows.length} · ${fmt(sum)}
          {cap && filtered.length > cap ? ` · מוצגות ${cap} ראשונות` : ""}
        </span>
      </div>
      <div className="tablewrap" style={{ maxHeight: "60vh" }}>
        <table className="sticky">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.k} onClick={() => sortBy(c.k)}>
                  {c.t}
                  {sortK === c.k ? (sortDir > 0 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
            <tr className="filters">
              {cols.map((c) => (
                <th key={c.k}>
                  {c.type === "select" ? (
                    <select
                      value={f.sel[c.k] ?? ""}
                      onChange={(e) => setF({ ...f, sel: { ...f.sel, [c.k]: e.target.value } })}
                    >
                      <option value="">הכל</option>
                      {options[c.k]?.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : c.type === "num" ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        placeholder="min"
                        onChange={(e) =>
                          setF({
                            ...f,
                            num: {
                              ...f.num,
                              [c.k]: { ...f.num[c.k], min: e.target.value === "" ? undefined : Number(e.target.value) },
                            },
                          })
                        }
                      />
                      <input
                        placeholder="max"
                        onChange={(e) =>
                          setF({
                            ...f,
                            num: {
                              ...f.num,
                              [c.k]: { ...f.num[c.k], max: e.target.value === "" ? undefined : Number(e.target.value) },
                            },
                          })
                        }
                      />
                    </div>
                  ) : (
                    <input
                      placeholder="סינון..."
                      value={f.txt[c.k] ?? ""}
                      onChange={(e) => setF({ ...f, txt: { ...f.txt, [c.k]: e.target.value.toLowerCase() } })}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.k} style={c.k === "amt" ? { fontWeight: 600 } : undefined}>
                    {c.k === "amt" ? fmt(r.amt) : String(r[c.k] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {cols.map((c, i) => (
                <td key={c.k}>
                  {i === 0 ? `סה"כ (${filtered.length})` : c.k === "amt" ? "$" + fmt(sum) : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
