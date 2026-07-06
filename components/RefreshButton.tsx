"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  function refresh() {
    setBusy(true);
    router.refresh();
    // router.refresh re-runs the server layout (force-dynamic) → fresh Supabase fetch
    setTimeout(() => setBusy(false), 800);
  }
  return (
    <button className="btn" onClick={refresh} title="טעינה מחדש של הנתונים מ-Supabase">
      {busy ? "…מרענן" : "🔄 רענן נתונים"}
    </button>
  );
}
