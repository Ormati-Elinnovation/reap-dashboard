"use client";
import { useState } from "react";
import { triggerReload } from "@/lib/dataStore";

export default function RefreshButton() {
  const [busy, setBusy] = useState(false);
  function refresh() {
    setBusy(true);
    triggerReload();
    setTimeout(() => setBusy(false), 800);
  }
  return (
    <button className="btn" onClick={refresh} title="טעינה מחדש של הנתונים מ-Supabase">
      {busy ? "…מרענן" : "🔄 רענן נתונים"}
    </button>
  );
}
