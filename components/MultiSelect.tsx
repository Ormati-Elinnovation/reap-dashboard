"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 2, right: window.innerWidth - r.right });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label = selected.length === 0 ? "הכל" : selected.length === 1 ? selected[0] : `${selected.length} נבחרו`;
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  }
  const shown = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={selected.join(", ")}
        style={{
          width: "100%",
          background: "var(--bg)",
          border: "1px solid " + (selected.length ? "var(--accent)" : "var(--line)"),
          color: "var(--txt)",
          padding: "5px 7px",
          borderRadius: 7,
          fontSize: 12,
          fontFamily: "inherit",
          cursor: "pointer",
          textAlign: "right",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label} ▾
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 1000,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 6,
              minWidth: 190,
              maxHeight: 280,
              overflow: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,.45)",
            }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                autoFocus
                placeholder="חיפוש..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--txt)", padding: "4px 6px", borderRadius: 6, fontSize: 12, fontFamily: "inherit" }}
              />
              {selected.length > 0 && (
                <button className="mini" onClick={() => onChange([])}>
                  נקה
                </button>
              )}
            </div>
            {shown.map((v) => (
              <label
                key={v}
                style={{ display: "flex", gap: 6, alignItems: "center", padding: "3px 4px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} />
                {v}
              </label>
            ))}
            {shown.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 4 }}>אין תוצאות</div>}
          </div>,
          document.body
        )}
    </>
  );
}
