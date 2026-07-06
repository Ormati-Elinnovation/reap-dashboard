"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <h1 style={{ marginBottom: 4 }}>Reap</h1>
      <div className="sub">התחברות לדשבורד ההוצאות</div>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {err && <div className="err">{err}</div>}
        <button className="btn primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "מתחבר…" : "התחבר"}
        </button>
      </form>
    </div>
  );
}
