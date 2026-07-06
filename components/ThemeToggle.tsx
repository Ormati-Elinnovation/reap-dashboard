"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);
  function toggle() {
    const next = document.documentElement.dataset.theme === "light" ? "" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setLight(next === "light");
  }
  return (
    <button className="btn" onClick={toggle}>
      {light ? "🌙 Night" : "☀️ Day"}
    </button>
  );
}
