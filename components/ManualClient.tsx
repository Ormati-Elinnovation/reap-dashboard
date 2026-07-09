"use client";
import { useMemo, useState } from "react";
import { useTx } from "@/components/TransactionsProvider";
import { COMPANY_ORDER, DEPARTMENTS } from "@/lib/types";
import { fmt } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { triggerReload } from "@/lib/dataStore";
import { addManual, deleteManual, type ManualInput } from "@/app/(dashboard)/manual/actions";

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  color: "var(--txt)",
  padding: "7px 9px",
  borderRadius: 7,
  fontSize: 13,
  fontFamily: "inherit",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ManualClient() {
  const { tx } = useTx();

  const merchants = useMemo(
    () => Array.from(new Set(tx.map((r) => r.merchant))).sort(),
    [tx]
  );
  const cats = useMemo(
    () => Array.from(new Set(tx.map((r) => r.cat).filter(Boolean) as string[])).sort(),
    [tx]
  );
  const manualRows = useMemo(
    () => tx.filter((r) => r.manual).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [tx]
  );

  const [date, setDate] = useState(today());
  const [company, setCompany] = useState<string>(COMPANY_ORDER[0]);
  const [merchant, setMerchant] = useState("");
  const [cat, setCat] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMsg("");
    const input: ManualInput = { date, company, merchant, cat, department, amt: Number(amt) };
    const res = await addManual(input);
    setBusy(false);
    if (res.error) return setMsg("שגיאה: " + res.error);
    setMsg("נוסף ✓");
    setMerchant("");
    setAmt("");
    triggerReload(); // refresh cached data → appears in all tabs
  }
  async function remove(id?: number) {
    if (!id) return;
    if (!confirm("למחוק את השורה?")) return;
    const res = await deleteManual(id);
    if (res.error) return setMsg("שגיאה: " + res.error);
    triggerReload();
  }

  return (
    <>
      <h3>🖊️ הוצאות ידניות <span className="muted">— הוצאות שלא היו בכרטיסי Reap</span></h3>
      <p className="sub">
        כל שורה נשמרת בטבלת ההוצאות הראשית ומופיעה אוטומטית בכל הטאבים (כל ההוצאות, כרטיסים, ספקים וכו&apos;). כרטיס = &quot;חיצוני&quot;.
      </p>

      {/* entry form */}
      <div className="tablewrap" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>חברה</th>
              <th>כרטיס</th>
              <th>ספק</th>
              <th>קטגוריה</th>
              <th>מחלקה</th>
              <th>חודש</th>
              <th>סכום $</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
              </td>
              <td>
                <select value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle}>
                  {COMPANY_ORDER.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </td>
              <td className="muted">חיצוני</td>
              <td>
                <input
                  list="manual-merchants"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="בחר או הקלד ספק"
                  style={{ ...inputStyle, minWidth: 160 }}
                />
                <datalist id="manual-merchants">
                  {merchants.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </td>
              <td>
                <select value={cat} onChange={(e) => setCat(e.target.value)} style={inputStyle}>
                  <option value="">— קטגוריה —</option>
                  {cats.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </td>
              <td>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} style={inputStyle}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </td>
              <td className="muted">{monthLabel(date.slice(0, 7))}</td>
              <td>
                <input
                  type="number"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, width: 100 }}
                />
              </td>
              <td>
                <button className="btn primary" onClick={add} disabled={busy}>
                  {busy ? "…" : "➕ הוסף"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {msg && <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>{msg}</p>}

      {/* existing manual rows */}
      <h3>רשומות ידניות ({manualRows.length}) <span className="muted">· סה&quot;כ ${fmt(manualRows.reduce((s, r) => s + r.amt, 0))}</span></h3>
      <div className="tablewrap" style={{ maxHeight: "56vh" }}>
        <table className="sticky">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>חברה</th>
              <th>ספק</th>
              <th>קטגוריה</th>
              <th>מחלקה</th>
              <th>חודש</th>
              <th style={{ textAlign: "right" }}>סכום $</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {manualRows.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.company}</td>
                <td>{r.merchant}</td>
                <td>{r.cat}</td>
                <td>{r.department}</td>
                <td>{monthLabel(r.month)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(r.amt)}</td>
                <td>
                  <button className="mini" onClick={() => remove(r.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {manualRows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 20 }}>
                  אין עדיין רשומות ידניות
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
