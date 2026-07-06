"use client";
import { exportRows } from "@/lib/xlsx";

export default function ExportButton({
  rows,
  sheet,
  filename,
  label = "⬇️ ייצוא לאקסל",
}: {
  rows: () => Record<string, unknown>[];
  sheet: string;
  filename: string;
  label?: string;
}) {
  return (
    <button className="btn primary" onClick={() => exportRows(rows(), sheet, filename)}>
      {label}
    </button>
  );
}
