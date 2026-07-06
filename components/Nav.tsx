"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const HOME: [string, string] = ["/", "🏠 סקירה"];
const LABELS: Record<string, string> = {
  "/technology": "🖥️ Technology Expenses",
  "/all": "📋 כל ההוצאות",
  "/servers": "☁️ שרתים",
  "/cards": "💳 כרטיסים",
  "/suppliers": "🏢 ספקים",
};
const DEFAULT_ORDER = Object.keys(LABELS);
const KEY = "reap-nav-order";

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export default function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname();
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [edit, setEdit] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && sameSet(parsed, DEFAULT_ORDER)) setOrder(parsed);
      }
    } catch {}
  }, []);

  function persist(next: string[]) {
    setOrder(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }
  function drop(to: number) {
    if (drag === null || drag === to) return;
    const next = [...order];
    const [moved] = next.splice(drag, 1);
    next.splice(to, 0, moved);
    persist(next);
    setDrag(null);
  }
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="nav">
      <Link href={HOME[0]} className={isActive(HOME[0]) ? "active" : ""}>
        {HOME[1]}
      </Link>

      {order.map((href, i) =>
        edit ? (
          <a
            key={href}
            className={isActive(href) ? "active" : ""}
            style={{ cursor: "grab", opacity: drag === i ? 0.5 : 1 }}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
            onDragEnd={() => setDrag(null)}
          >
            ⠿ {LABELS[href]}
          </a>
        ) : (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>
            {LABELS[href]}
          </Link>
        )
      )}

      {isAdmin && (
        <Link
          href="/admin"
          className={isActive("/admin") ? "active" : ""}
          style={{ marginInlineStart: "auto" }}
        >
          🔐 ניהול הרשאות
        </Link>
      )}

      <button
        className="mini"
        style={{ marginInlineStart: isAdmin ? undefined : "auto", alignSelf: "center" }}
        onClick={() => setEdit((e) => !e)}
        title="שינוי סדר הטאבים (גרירה)"
      >
        {edit ? "✓ סיום" : "✎ סדר טאבים"}
      </button>
      {edit && (
        <button className="mini" style={{ alignSelf: "center" }} onClick={() => persist(DEFAULT_ORDER)}>
          איפוס
        </button>
      )}
    </div>
  );
}
