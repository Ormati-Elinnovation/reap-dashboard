import type { Transaction } from "./types";

// Expense-type view: classify every transaction into a business category.
// Priority: manual department → tech classification → Reap category mapping.
export const CAT_MAP: Record<string, string> = {
  Software: "טכנולוגיה",
  "Computer Services": "טכנולוגיה",
  Advertising: "שיווק ופרסום",
  Marketing: "שיווק ופרסום",
  Travel: "נסיעות ותיירות",
  Airlines: "נסיעות ותיירות",
  Hotels: "נסיעות ותיירות",
  Lodging: "נסיעות ותיירות",
  Transportation: "נסיעות ותיירות",
  Restaurants: "אוכל ואירוח",
  Food: "אוכל ואירוח",
  Groceries: "אוכל ואירוח",
  Insurance: "מנהלה",
  "Professional Services": "שירותים מקצועיים",
  Legal: "שירותים מקצועיים",
  Accounting: "שירותים מקצועיים",
  Education: "הדרכה ולמידה",
  Telecom: "תקשורת",
  Utilities: "מנהלה",
  "Office Supplies": "מנהלה",
  Retail: "רכש כללי",
  Others: "אחר",
};

function isRonitTours(merchant: string): boolean {
  return (merchant || "").replace(/\s+/g, " ").toUpperCase().includes("RONIT TOURS");
}

export function classifyBiz(r: Transaction): string {
  if (isRonitTours(r.merchant)) return "נסיעות ותיירות";
  if (r.department) return r.department;
  if (r.tech_group || r.srv_group) return "טכנולוגיה";
  if (r.cat && CAT_MAP[r.cat]) return CAT_MAP[r.cat];
  if (r.cat) return r.cat;
  return "לא מסווג";
}
