"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 5) return setMsg("סיסמה קצרה מדי (5+ תווים)");
    if (pw !== pw2) return setMsg("הסיסמאות אינן תואמות");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg("שגיאה: " + error.message);
    setMsg("הסיסמה עודכנה בהצלחה ✓");
    setPw("");
    setPw2("");
  }

  return (
    <>
      <h3>🔑 החלפת סיסמה</h3>
      <p className="sub">בחר סיסמה חדשה לחשבון שלך.</p>
      <form onSubmit={change} className="card" style={{ maxWidth: 380 }}>
        <input
          type="password"
          placeholder="סיסמה חדשה"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--txt)", padding: "11px 13px", borderRadius: 9, fontSize: 14, marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="אימות סיסמה חדשה"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--txt)", padding: "11px 13px", borderRadius: 9, fontSize: 14, marginBottom: 10 }}
        />
        {msg && <div className="sub" style={{ marginBottom: 8 }}>{msg}</div>}
        <button className="btn primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "מעדכן…" : "עדכן סיסמה"}
        </button>
      </form>
    </>
  );
}
