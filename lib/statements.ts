import { readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

export const STATEMENTS_ROOT = path.join(process.cwd(), "data", "statements");

export type StatementFile = {
  company: string;
  file: string; // path relative to STATEMENTS_ROOT, posix-style
  kind: "csv" | "pdf";
  size: number;
};

export type StatementMonth = {
  month: string; // YYYY-MM
  files: StatementFile[];
};

function companyFromName(name: string): string {
  // 2026-08-Gems-labs.csv / 2026-08-Gems-labs-pay.pdf → "Gems labs"
  const base = name.replace(/^\d{4}-\d{2}-/, "").replace(/(-pay)?\.(csv|pdf)$/i, "");
  return base.replace(/-/g, " ");
}

/** List all statement files on disk, grouped by month (newest first). */
export function listStatements(): StatementMonth[] {
  if (!existsSync(STATEMENTS_ROOT)) return [];
  const months = readdirSync(STATEMENTS_ROOT)
    .filter((d) => /^\d{4}-\d{2}$/.test(d))
    .sort()
    .reverse();

  return months.map((month) => {
    const dir = path.join(STATEMENTS_ROOT, month);
    const files: StatementFile[] = [];

    for (const f of readdirSync(dir)) {
      const full = path.join(dir, f);
      if (statSync(full).isFile() && f.toLowerCase().endsWith(".csv")) {
        files.push({ company: companyFromName(f), file: `${month}/${f}`, kind: "csv", size: statSync(full).size });
      }
    }
    const payDir = path.join(dir, "reap-pay");
    if (existsSync(payDir)) {
      for (const f of readdirSync(payDir)) {
        const full = path.join(payDir, f);
        if (statSync(full).isFile() && f.toLowerCase().endsWith(".pdf")) {
          files.push({ company: companyFromName(f), file: `${month}/reap-pay/${f}`, kind: "pdf", size: statSync(full).size });
        }
      }
    }
    return { month, files };
  });
}

/** Resolve a relative statement path safely; returns null on traversal attempts. */
export function resolveStatement(rel: string): string | null {
  const full = path.resolve(STATEMENTS_ROOT, rel);
  if (!full.startsWith(STATEMENTS_ROOT + path.sep)) return null;
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  const ext = path.extname(full).toLowerCase();
  if (ext !== ".pdf" && ext !== ".csv") return null;
  return full;
}
