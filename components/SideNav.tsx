"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { triggerReload } from "@/lib/dataStore";
import { useEffect, useState } from "react";

type Item = { href: string; label: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "סקירה",
    items: [
      { href: "/", label: "🏠 סקירה כללית" },
      { href: "/all", label: "📋 כל ההוצאות" },
    ],
  },
  {
    title: "פילוחים",
    items: [
      { href: "/companies", label: "🏛️ לפי חברה" },
      { href: "/cards", label: "💳 לפי כרטיס" },
      { href: "/suppliers", label: "🏢 לפי ספק" },
      { href: "/categories", label: "🗂️ לפי סוג הוצאה" },
    ],
  },
  {
    title: "טכנולוגיה",
    items: [
      { href: "/technology", label: "🖥️ Technology Expenses" },
      { href: "/servers", label: "☁️ שרתים" },
    ],
  },
  {
    title: "מסמכים",
    items: [{ href: "/statements", label: "📄 דפי חשבון" }],
  },
];

const ADMIN_ITEMS: Item[] = [
  { href: "/manual", label: "🖊️ הזנה ידנית" },
  { href: "/admin", label: "🔐 ניהול הרשאות" },
];

function Actions({ close }: { close: () => void }) {
  const router = useRouter();
  const [light, setLight] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setLight(next === "light");
  }
  function refresh() {
    setBusy(true);
    triggerReload();
    setTimeout(() => setBusy(false), 800);
    close();
  }
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sidenav-group sidenav-actions">
      <div className="sidenav-title">פעולות</div>
      <button onClick={refresh}>{busy ? "…מרענן" : "🔄 רענן נתונים"}</button>
      <button onClick={toggleTheme}>{light ? "🌙 מצב לילה" : "☀️ מצב יום"}</button>
      <Link href="/account" onClick={close}>🔑 שינוי סיסמה</Link>
      <button onClick={signOut}>🚪 יציאה</button>
    </div>
  );
}

export default function SideNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation and on Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <button className="burger" onClick={() => setOpen(true)} aria-label="תפריט" title="תפריט">
        <span className="burger-lines" aria-hidden>
          <span /><span /><span />
        </span>
      </button>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className={`sidenav ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sidenav-head">
          <strong>Reap</strong>
          <button className="mini" onClick={() => setOpen(false)} aria-label="סגור">✕</button>
        </div>

        {GROUPS.map((g) => (
          <div key={g.title} className="sidenav-group">
            <div className="sidenav-title">{g.title}</div>
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
                {it.label}
              </Link>
            ))}
          </div>
        ))}

        {isAdmin && (
          <div className="sidenav-group">
            <div className="sidenav-title">ניהול</div>
            {ADMIN_ITEMS.map((it) => (
              <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
                {it.label}
              </Link>
            ))}
          </div>
        )}

        <Actions close={() => setOpen(false)} />
      </aside>
    </>
  );
}
