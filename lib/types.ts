export type Transaction = {
  id?: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  ts?: string | null;
  tid?: string | null;
  company: string;
  card: string; // keep as text (leading zeros)
  holder: string;
  merchant: string;
  cat: string | null;
  amt: number;
  status: string | null;
  srv_group?: string | null; // AWS | AUTOMAT | MongoDB | null
  tech_supplier?: string | null;
  tech_group?: string | null;
  department?: string | null;
  manual?: boolean;
};

export const DEPARTMENTS = ["טכנולוגיה", "פייננס", "אופרציה", "מרקטינג", "משפטי"] as const;

export type TechMap = Record<string, [string, string]>; // merchant -> [supplier, group]

export const COMPANY_ORDER = [
  "Rain",
  "Mezada",
  "Lufturit",
  "Hodlr",
  "Gems labs",
  "Elinnovation",
  "DOP",
] as const;

export const HEB_MONTHS: Record<string, string> = {
  "01": "ינואר", "02": "פברואר", "03": "מרץ", "04": "אפריל", "05": "מאי", "06": "יוני",
  "07": "יולי", "08": "אוגוסט", "09": "ספטמבר", "10": "אוקטובר", "11": "נובמבר", "12": "דצמבר",
};
