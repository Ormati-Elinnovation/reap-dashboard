"use client";
import Link from "next/link";

type Kind = "card" | "company" | "merchant" | "holder";

export function entityHref(kind: Kind, value: string): string {
  const q = encodeURIComponent(value);
  if (kind === "card") return `/cards?card=${q}`;
  if (kind === "holder") return `/cards?holder=${q}`;
  if (kind === "company") return `/companies?company=${q}`;
  return `/suppliers?merchant=${q}`;
}

export default function EntityLink({
  kind,
  value,
  children,
}: {
  kind: Kind;
  value: string;
  children: React.ReactNode;
}) {
  if (!value) return <>{children}</>;
  return (
    <Link
      href={entityHref(kind, value)}
      style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}
      title="פתח פירוט"
    >
      {children}
    </Link>
  );
}
