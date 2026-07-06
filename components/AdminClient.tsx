"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTx } from "@/components/TransactionsProvider";
import { createClient } from "@/lib/supabase/client";
import { COMPANY_ORDER } from "@/lib/types";
import { fmt } from "@/lib/format";
import { createLogin } from "@/app/(dashboard)/admin/actions";

type UserAccess = {
  email: string;
  is_admin: boolean;
  all_companies: boolean;
  companies: string[];
  denied_cards: string[];
};

export default function AdminClient({ currentEmail }: { currentEmail: string }) {
  const { tx } = useTx();
  const supabase = useMemo(() => createClient(), []);

  const companyList = COMPANY_ORDER.filter((c) => tx.some((r) => r.company === c));
  const cardsByCompany = useMemo(() => {
    const m = new Map<string, Map<string, { card: string; holder: string; tot: number }>>();
    for (const r of tx) {
      if (!m.has(r.company)) m.set(r.company, new Map());
      const inner = m.get(r.company)!;
      const e = inner.get(r.card) ?? { card: r.card, holder: r.holder, tot: 0 };
      e.tot += r.amt;
      inner.set(r.card, e);
    }
    const out: Record<string, { card: string; holder: string; tot: number }[]> = {};
    for (const [co, inner] of m) out[co] = [...inner.values()].sort((a, b) => b.tot - a.tot);
    return out;
  }, [tx]);

  const [rows, setRows] = useState<UserAccess[]>([]);
  const [status, setStatus] = useState("");
  // form
  const [email, setEmail] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [isAdminF, setIsAdminF] = useState(false);
  const [allCo, setAllCo] = useState(false);
  const [companies, setCompanies] = useState<Set<string>>(new Set());
  const [denied, setDenied] = useState<Set<string>>(new Set());
  const [pw, setPw] = useState("");

  async function loadRows() {
    const { data } = await supabase.from("user_access").select("*").order("email");
    setRows((data as UserAccess[]) ?? []);
  }
  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editUser(u: UserAccess) {
    setEmail(u.email);
    setIsNew(false);
    setIsAdminF(u.is_admin);
    setAllCo(u.all_companies);
    setCompanies(new Set(u.companies ?? []));
    setDenied(new Set(u.denied_cards ?? []));
    setPw("");
    setStatus("");
  }
  function newUser() {
    setEmail("");
    setIsNew(true);
    setIsAdminF(false);
    setAllCo(false);
    setCompanies(new Set());
    setDenied(new Set());
    setPw("");
    setStatus("");
  }
  function toggle(set: Set<string>, v: string, upd: (s: Set<string>) => void) {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    upd(n);
  }
  // Toggling a company; if "all companies" was on, convert to an explicit allow-list
  // of every company except the one being turned off (its cards cascade off visually).
  function toggleCompany(co: string) {
    if (allCo) {
      setAllCo(false);
      setCompanies(new Set(companyList.filter((c) => c !== co)));
    } else {
      toggle(companies, co, setCompanies);
    }
  }

  async function save() {
    const em = email.toLowerCase().trim();
    if (!em) return setStatus("הזן אימייל");
    if (em === currentEmail && !isAdminF) return setStatus("אי אפשר להסיר לעצמך הרשאת מנהל");
    const payload: UserAccess = {
      email: em,
      is_admin: isAdminF,
      all_companies: allCo,
      companies: allCo ? [] : [...companies],
      denied_cards: [...denied],
    };
    const { error } = await supabase.from("user_access").upsert(payload);
    setStatus(error ? "שגיאה: " + error.message : "נשמר ✓");
    if (!error) {
      setIsNew(false);
      loadRows();
    }
  }
  async function del() {
    const em = email.toLowerCase().trim();
    if (em === currentEmail) return setStatus("אי אפשר למחוק את עצמך");
    await supabase.from("user_access").delete().eq("email", em);
    setStatus("נמחק");
    newUser();
    loadRows();
  }
  async function makeLogin() {
    const res = await createLogin(email.toLowerCase().trim(), pw);
    setStatus(res.error ? "שגיאה: " + res.error : "משתמש התחברות נוצר ✓");
    if (res.ok) setPw("");
  }

  return (
    <>
      <h3>🔐 ניהול הרשאות משתמשים</h3>
      <p className="sub">
        קבע לכל משתמש (לפי אימייל) אילו חברות מותרות לצפייה, וכבה כרטיסים מסוימים שלא יראה. ההגבלה נאכפת ב-DB (RLS) — משתמש מוגבל לא יכול לגשת לנתונים אחרים גם ישירות.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        {/* users list */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="lbl">משתמשים ({rows.length})</div>
            <button className="mini" onClick={newUser}>➕ חדש</button>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {rows.map((u) => (
              <button
                key={u.email}
                className={"btn"}
                style={{
                  textAlign: "right",
                  borderColor: u.email === email && !isNew ? "var(--accent)" : "var(--line)",
                }}
                onClick={() => editUser(u)}
              >
                <div style={{ fontSize: 13 }}>{u.email}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {u.is_admin ? "מנהל · הכל" : u.all_companies ? "כל החברות" : `${u.companies?.length ?? 0} חברות`}
                  {u.denied_cards?.length ? ` · ${u.denied_cards.length} כרטיסים חסומים` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* editor */}
        <div className="card">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <input
              className="search"
              placeholder="אימייל של המשתמש"
              value={email}
              disabled={!isNew}
              onChange={(e) => setEmail(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <div className="tabs" style={{ margin: 0 }}>
              <button className={!isAdminF ? "on" : ""} onClick={() => setIsAdminF(false)}>
                👤 חבר צוות
              </button>
              <button className={isAdminF ? "on" : ""} onClick={() => setIsAdminF(true)}>
                🧑‍✈️ מנהל
              </button>
            </div>
            {!isAdminF && (
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" checked={allCo} onChange={(e) => setAllCo(e.target.checked)} /> כל החברות
              </label>
            )}
          </div>
          {isAdminF && (
            <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 12 }}>
              מנהל רואה את כל הנתונים ויכול לנהל הרשאות. לבחירת חברות/כרטיסים ספציפיים — בחר &quot;חבר צוות&quot;.
            </p>
          )}

          {!isAdminF && (
            <>
              <div className="lbl">
                חברות וכרטיסים <span className="muted">— סמן ✓ לצפייה · בטל סימון כדי לכבות חברה או כרטיס</span>
              </div>
              <div className="tablewrap" style={{ marginBottom: 12, maxHeight: "52vh" }}>
                <table>
                  <thead>
                    <tr>
                      <th>חברה / כרטיס</th>
                      <th>מחזיק</th>
                      <th style={{ textAlign: "right" }}>סה&quot;כ $</th>
                      <th style={{ textAlign: "center" }}>צפייה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyList.map((co) => {
                      const cc = cardsByCompany[co] ?? [];
                      const coTot = cc.reduce((s, c) => s + c.tot, 0);
                      const coAllowed = allCo || companies.has(co);
                      return (
                        <Fragment key={co}>
                          <tr style={{ background: "var(--panel2)" }}>
                            <td style={{ fontWeight: 700 }}>{co}</td>
                            <td className="muted">{cc.length} כרטיסים</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>${fmt(coTot)}</td>
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={coAllowed}
                                title="צפייה בחברה — ביטול מכבה את כל הכרטיסים שלה"
                                onChange={() => toggleCompany(co)}
                              />
                            </td>
                          </tr>
                          {cc.map((c) => (
                            <tr key={c.card} style={{ opacity: coAllowed ? 1 : 0.4 }}>
                              <td>↳ כרטיס {c.card}</td>
                              <td>{c.holder}</td>
                              <td style={{ textAlign: "right" }}>${fmt(c.tot)}</td>
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={coAllowed && !denied.has(c.card)}
                                  disabled={!coAllowed}
                                  title="צפייה בכרטיס"
                                  onChange={() => toggle(denied, c.card, setDenied)}
                                />
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn primary" onClick={save}>💾 שמור הרשאות</button>
            {!isNew && email !== currentEmail && (
              <button className="btn" onClick={del}>🗑️ מחק</button>
            )}
            {status && <span className="muted" style={{ fontSize: 13 }}>{status}</span>}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12 }}>
            <div className="lbl">יצירת התחברות (אם למשתמש עדיין אין חשבון)</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
              <input
                className="search"
                type="text"
                placeholder="סיסמה ראשונית"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                style={{ minWidth: 180 }}
              />
              <button className="btn" onClick={makeLogin} disabled={!email || !pw}>
                ➕ צור התחברות ל-{email || "…"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
