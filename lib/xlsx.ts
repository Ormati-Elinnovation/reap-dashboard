import * as XLSX from "xlsx";

export function exportRows(
  rows: Record<string, unknown>[],
  sheet: string,
  filename: string
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 28));
  XLSX.writeFile(wb, filename);
}
