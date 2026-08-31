"use client";
import { useMemo, useState } from "react";
import { useTx } from "@/components/TransactionsProvider";
import { createClient } from "@/lib/supabase/client";
import { COMPANY_ORDER } from "@/lib/types";
import {
  createApiKey,
  deleteApiKey,
  setApiKeyActive,
  updateApiKey,
  type ApiKeyInput,
} from "@/app/(dashboard)/admin/api-keys-actions";

type ApiKeyRow = {
  id: number;
  name: string;
  prefix: string;
  all_companies: boolean;
  companies: string[];
  denied_cards: string[];
  active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
};

const EMPTY: ApiKeyInput = { name: "", all_companies: true, companies: [], denied_cards: [], expires_at: null };

function when(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("he-IL") : "—";
}

export default function ApiKeysClient() {
  const { tx } = useTx();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [form, setForm] = useState<ApiKeyInput>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [fresh, setFresh] = useState<string>("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const companyList = COMPANY_ORDER.filter((c) => tx.some((r) => r.company === c));
  const cards = useMemo(() => {
    const m = new Map<string, { card: string; holder: string; company: string }>();
    for (const r of tx) if (!m.has(r.card)) m.set(r.card, { card: r.card, holder: r.holder, company: r.company });
    return [...m.values()].sort((a, b) => a.company.localeCompare(b.company));
  }, [tx]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const { data } = await supabase
      .from("api_keys")
      .select("id,name,prefix,all_companies,companies,denied_cards,active,expires_at,last_used_at,created_by,created_at")
      .order("created_at", { ascending: false });
    setRows((data as ApiKeyRow[]) ?? []);
  }
  function toggleOpen() {
    setOpen((o) => {
      if (!o) load();
      return !o;
    });
  }

  function toggleIn(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function editRow(k: ApiKeyRow) {
    setEditing(k.id);
    setFresh("");
    setStatus("");
    setForm({
      name: k.name,
      all_companies: k.all_companies,
      companies: k.companies ?? [],
      denied_cards: k.denied_cards ?? [],
      expires_at: k.expires_at ? k.expires_at.slice(0, 10) : null,
    });
  }

  async function save() {
    setStatus("שומר…");
    if (editing === null) {
      const res = await createApiKey(form);
      if (res.error) return setStatus("שגיאה: " + res.error);
      setFresh(res.key!);
      setStatus("המפתח נוצר ✓ — העתק אותו עכשיו, הוא לא יוצג שוב");
    } else {
      const res = await updateApiKey(editing, form);
      if (res.error) return setStatus("שגיאה: " + res.error);
      setStatus("נשמר ✓");
    }
    setForm(EMPTY);
    setEditing(null);
    load();
  }

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(msg);
    } catch {
      setStatus("העתקה נכשלה — סמן והעתק ידנית");
    }
  }

  return (
    <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🔌 מפתחות API — חיבור מערכות חיצוניות</h3>
        <button className="btn" onClick={toggleOpen}>
          {open ? "▲ סגור" : "▼ פתח"}
        </button>
        {open && (
          <a className="btn" href="/api-docs" target="_blank" rel="noreferrer">
            📖 תיעוד ה-API (Swagger)
          </a>
        )}
      </div>
      <p className="sub" style={{ marginTop: 6 }}>
        מפתח API מאפשר למערכת אחרת לקרוא את נתוני הדשבורד (קריאה בלבד), עם אותן הגבלות חברות/כרטיסים
        כמו למשתמש. כתובת הבסיס: <code>{origin}/api/v1</code>
      </p>

      {!open ? null : (
        <>
          {fresh && (
            <div className="card" style={{ borderColor: "var(--accent)", marginBottom: 12 }}>
              <div className="lbl">המפתח החדש — מוצג פעם אחת בלבד</div>
              <input
                className="search"
                readOnly
                value={fresh}
                onFocus={(e) => e.currentTarget.select()}
                style={{ width: "100%", fontFamily: "monospace", marginTop: 6 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button className="btn primary" onClick={() => copy(fresh, "המפתח הועתק ✓")}>
                  📋 העתק מפתח
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    copy(
                      `כתובת בסיס: ${origin}/api/v1\nמפתח: ${fresh}\n\nדוגמה:\ncurl -H "Authorization: Bearer ${fresh}" ${origin}/api/v1/summary`,
                      "פרטי החיבור הועתקו ✓"
                    )
                  }
                >
                  📋 העתק הוראות חיבור (כתובת + מפתח + דוגמה)
                </button>
                <button className="btn" onClick={() => setFresh("")}>סגור</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            {/* editor */}
            <div className="card">
              <div className="lbl">{editing === null ? "יצירת מפתח חדש" : "עריכת מפתח"}</div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <input
                  className="search"
                  placeholder="שם המפתח (למשל: מערכת הנהלת חשבונות)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <label style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.all_companies}
                    onChange={(e) => setForm({ ...form, all_companies: e.target.checked })}
                  />{" "}
                  גישה לכל החברות
                </label>
                {!form.all_companies && (
                  <div className="chipbar">
                    {companyList.map((c) => (
                      <button
                        key={c}
                        className={"chip" + (form.companies.includes(c) ? "" : " off")}
                        onClick={() => setForm({ ...form, companies: toggleIn(form.companies, c) })}
                      >
                        {form.companies.includes(c) ? "☑" : "☐"} {c}
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <div className="lbl" style={{ fontSize: 12 }}>
                    כרטיסים חסומים <span className="muted">— לא יוחזרו ב-API</span>
                  </div>
                  <div className="chipbar" style={{ maxHeight: 130, overflow: "auto" }}>
                    {cards.map((c) => (
                      <button
                        key={c.card}
                        className={"chip" + (form.denied_cards.includes(c.card) ? " off" : "")}
                        title={`${c.company} · ${c.holder}`}
                        onClick={() => setForm({ ...form, denied_cards: toggleIn(form.denied_cards, c.card) })}
                      >
                        {form.denied_cards.includes(c.card) ? "🚫" : "☐"} {c.card}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  תפוגה (אופציונלי):
                  <input
                    className="search"
                    type="date"
                    value={form.expires_at ?? ""}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn primary" onClick={save}>
                    {editing === null ? "🔑 צור מפתח" : "💾 שמור שינויים"}
                  </button>
                  {editing !== null && (
                    <button className="btn" onClick={() => { setEditing(null); setForm(EMPTY); setStatus(""); }}>
                      ביטול
                    </button>
                  )}
                  {status && <span className="muted" style={{ fontSize: 13 }}>{status}</span>}
                </div>
              </div>
            </div>

            {/* list */}
            <div className="card">
              <div className="lbl">מפתחות קיימים ({rows.length})</div>
              <div className="tablewrap" style={{ maxHeight: "46vh", marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>שם</th>
                      <th>מפתח</th>
                      <th>הרשאות</th>
                      <th>שימוש אחרון</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((k) => (
                      <tr key={k.id} style={{ opacity: k.active ? 1 : 0.45 }}>
                        <td>
                          {k.name}
                          {!k.active && <span className="pill"> מושבת</span>}
                          {k.expires_at && new Date(k.expires_at) < new Date() && (
                            <span className="pill"> פג תוקף</span>
                          )}
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{k.prefix}…</td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {k.all_companies ? "כל החברות" : `${k.companies?.length ?? 0} חברות`}
                          {k.denied_cards?.length ? ` · ${k.denied_cards.length} כרטיסים חסומים` : ""}
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>{when(k.last_used_at)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="mini" onClick={() => editRow(k)}>✎</button>{" "}
                          <button
                            className="mini"
                            title={k.active ? "השבת" : "הפעל"}
                            onClick={async () => {
                              await setApiKeyActive(k.id, !k.active);
                              load();
                            }}
                          >
                            {k.active ? "⏸" : "▶"}
                          </button>{" "}
                          <button
                            className="mini"
                            onClick={async () => {
                              if (!confirm(`למחוק את המפתח "${k.name}"? מערכות שמשתמשות בו יפסיקו לעבוד.`)) return;
                              await deleteApiKey(k.id);
                              load();
                            }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="muted">עדיין לא נוצרו מפתחות</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
