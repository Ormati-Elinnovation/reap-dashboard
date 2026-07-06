"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { PivotGroup, PivotSub } from "@/lib/pivot";
import { fmt } from "@/lib/format";
import { monthLabel } from "@/lib/months";

export type ExcludeConfig = {
  off: Set<string>;
  onToggle: (key: string) => void;
};

export default function PivotTable({
  groups,
  months,
  partial,
  nMon,
  firstCol,
  groupLabel,
  subLabel,
  exclude,
}: {
  groups: PivotGroup[];
  months: string[];
  partial: string | null;
  nMon: number;
  firstCol: string;
  groupLabel: (g: PivotGroup) => ReactNode;
  subLabel: (s: PivotSub) => ReactNode;
  exclude?: ExcludeConfig;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sortK, setSortK] = useState<string>("tot");
  const [sortDir, setSortDir] = useState<number>(-1);

  const div = nMon || 1;
  function val(g: PivotGroup, k: string): number | string {
    if (k === "name") return g.key;
    if (k === "tot") return g.tot;
    if (k === "avg") return g.tot / div;
    if (k === "n") return g.n;
    return g.mon[k] || 0;
  }
  const sorted = useMemo(() => {
    const arr = [...groups];
    arr.sort((a, b) => {
      const x = val(a, sortK);
      const y = val(b, sortK);
      if (typeof x === "number" && typeof y === "number") return (x - y) * sortDir;
      return String(x).localeCompare(String(y)) * sortDir;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, sortK, sortDir, div]);

  const included = exclude ? sorted.filter((g) => !exclude.off.has(g.key)) : sorted;
  function sortBy(k: string) {
    if (sortK === k) setSortDir((d) => -d);
    else {
      setSortK(k);
      setSortDir(k === "name" ? 1 : -1);
    }
  }
  function toggleOpen(k: string) {
    setOpen((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  }

  const arrow = (k: string) => (sortK === k ? (sortDir > 0 ? " ▲" : " ▼") : "");
  const footMon = months.map((mo) => included.reduce((a, g) => a + (g.mon[mo] || 0), 0));
  const footTot = included.reduce((a, g) => a + g.tot, 0);
  const footN = included.reduce((a, g) => a + g.n, 0);

  return (
    <>
      <div className="toolbar">
        <button className="btn" onClick={() => setOpen(new Set(groups.map((g) => g.key)))}>
          פתח הכל
        </button>
        <button className="btn" onClick={() => setOpen(new Set())}>
          סגור הכל
        </button>
        <span className="muted">
          {included.length} · ${fmt(footTot)}
        </span>
      </div>
      <div className="tablewrap" style={{ maxHeight: "56vh" }}>
        <table className="sticky">
          <thead>
            <tr>
              <th onClick={() => sortBy("name")}>
                {firstCol}
                {arrow("name")}
              </th>
              {months.map((mo) => (
                <th key={mo} style={{ textAlign: "right" }} onClick={() => sortBy(mo)}>
                  {monthLabel(mo)}
                  {mo === partial ? " (חלקי)" : ""}
                  {arrow(mo)}
                </th>
              ))}
              <th style={{ textAlign: "right" }} onClick={() => sortBy("tot")}>
                סה&quot;כ{arrow("tot")}
              </th>
              <th style={{ textAlign: "right" }} onClick={() => sortBy("avg")}>
                ממוצע חודשי{arrow("avg")}
              </th>
              <th style={{ textAlign: "right" }} onClick={() => sortBy("n")}>
                עסקאות{arrow("n")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => {
              const isOff = exclude?.off.has(g.key) ?? false;
              const isOpen = open.has(g.key);
              return (
                <FragmentRow
                  key={g.key}
                  g={g}
                  months={months}
                  div={div}
                  isOff={isOff}
                  isOpen={isOpen}
                  exclude={exclude}
                  groupLabel={groupLabel}
                  subLabel={subLabel}
                  onToggleOpen={() => toggleOpen(g.key)}
                />
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>סה&quot;כ ({included.length})</td>
              {footMon.map((s, i) => (
                <td key={i} style={{ textAlign: "right" }}>
                  ${fmt(s)}
                </td>
              ))}
              <td style={{ textAlign: "right" }}>${fmt(footTot)}</td>
              <td style={{ textAlign: "right", color: "var(--accent)" }}>${fmt(footTot / div)}</td>
              <td style={{ textAlign: "right" }}>{footN}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function FragmentRow({
  g,
  months,
  div,
  isOff,
  isOpen,
  exclude,
  groupLabel,
  subLabel,
  onToggleOpen,
}: {
  g: PivotGroup;
  months: string[];
  div: number;
  isOff: boolean;
  isOpen: boolean;
  exclude?: ExcludeConfig;
  groupLabel: (g: PivotGroup) => ReactNode;
  subLabel: (s: PivotSub) => ReactNode;
  onToggleOpen: () => void;
}) {
  return (
    <>
      <tr className={"exp-row srow" + (isOff ? " off" : "")} onClick={onToggleOpen}>
        <td>
          {exclude && (
            <span
              className="ck"
              title="הוסף/הסר מהסה&quot;כ"
              onClick={(e) => {
                e.stopPropagation();
                exclude.onToggle(g.key);
              }}
            >
              {isOff ? "☐" : "☑"}
            </span>
          )}{" "}
          <span className="tg">{isOpen ? "▼" : "▶"}</span>
          {groupLabel(g)}
        </td>
        {months.map((mo) => (
          <td key={mo} style={{ textAlign: "right" }}>
            {g.mon[mo] ? "$" + fmt(g.mon[mo]) : "—"}
          </td>
        ))}
        <td style={{ textAlign: "right", fontWeight: 700 }}>${fmt(g.tot)}</td>
        <td style={{ textAlign: "right", color: "var(--accent)", fontWeight: 700 }}>${fmt(g.tot / div)}</td>
        <td style={{ textAlign: "right" }}>{g.n}</td>
      </tr>
      {isOpen &&
        g.subs.map((s) => (
          <tr className="sub" key={s.key}>
            <td>{subLabel(s)}</td>
            {months.map((mo) => (
              <td key={mo} style={{ textAlign: "right" }}>
                {s.mon[mo] ? "$" + fmt(s.mon[mo]) : "—"}
              </td>
            ))}
            <td style={{ textAlign: "right" }}>${fmt(s.tot)}</td>
            <td style={{ textAlign: "right" }}>${fmt(s.tot / div)}</td>
            <td style={{ textAlign: "right" }}>{s.n}</td>
          </tr>
        ))}
    </>
  );
}
