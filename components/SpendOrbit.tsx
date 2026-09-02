"use client";
import Link from "next/link";
import { fmt } from "@/lib/format";

const COLORS = [
  "rgba(147,176,230,.55)",
  "rgba(176,196,222,.55)",
  "rgba(168,216,234,.5)",
  "rgba(198,186,232,.5)",
  "rgba(186,214,210,.5)",
  "rgba(210,200,230,.5)",
  "rgba(160,196,232,.5)",
];

export type OrbitItem = { label: string; amt: number; href?: string };

export default function SpendOrbit({
  total,
  month,
  items,
}: {
  total: number;
  month: string;
  items: OrbitItem[];
}) {
  const top = items.filter((i) => i.amt > 0).slice(0, 7);
  const max = Math.max(1, ...top.map((i) => i.amt));

  return (
    <div className="card orbit-wrap">
      <div className="orbit-stage">
        <div className="orbit-core">
          <div className="orbit-core-lbl">{month}</div>
          <div className="orbit-core-val">${fmt(total)}</div>
          <div className="orbit-core-sub">סה״כ החודש</div>
        </div>
        {top.map((it, i) => {
          const share = total > 0 ? (it.amt / total) * 100 : 0;
          const size = 54 + (it.amt / max) * 42;
          const delay = `${i * 0.35}s`;
          const inner = (
            <>
              <span className="orbit-name">{it.label}</span>
              <span className="orbit-pct">{share.toFixed(0)}%</span>
            </>
          );
          const style = {
            width: size,
            height: size,
            background: COLORS[i % COLORS.length],
            animationDelay: delay,
            ["--i" as string]: String(i),
          } as React.CSSProperties;
          return it.href ? (
            <Link key={it.label} href={it.href} className="orbit-ball" style={style} title={`${it.label} · $${fmt(it.amt)}`}>
              {inner}
            </Link>
          ) : (
            <div key={it.label} className="orbit-ball" style={style} title={`${it.label} · $${fmt(it.amt)}`}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
