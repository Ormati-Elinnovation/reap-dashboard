import { apiJson, preflight } from "@/lib/api/http";

// Public discovery endpoint — no key required, exposes no data.
export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  apiJson(req, {
    name: "Reap Expenses API",
    version: "v1",
    auth: "Authorization: Bearer <api_key>  (או x-api-key)",
    currency: "USD",
    endpoints: {
      "GET /api/v1/me": "פרטי המפתח וההרשאות שלו",
      "GET /api/v1/meta": "חודשים, חברות, כרטיסים, קטגוריות ומחלקות זמינים",
      "GET /api/v1/summary": "סיכום כללי — סה\"כ, ממוצע חודשי, מובילים",
      "GET /api/v1/monthly": "סה\"כ לפי חודש",
      "GET /api/v1/companies": "פילוח לפי חברה → כרטיס",
      "GET /api/v1/cards": "פילוח לפי כרטיס → ספק",
      "GET /api/v1/suppliers": "פילוח לפי ספק → כרטיס",
      "GET /api/v1/technology": "הוצאות טכנולוגיה לפי קבוצה → ספק",
      "GET /api/v1/servers": "הוצאות שרתים (AWS/AUTOMAT/MongoDB)",
      "GET /api/v1/departments": "פילוח לפי מחלקה",
      "GET /api/v1/transactions": "עסקאות גולמיות (עם עימוד)",
    },
    filters: [
      "from=YYYY-MM-DD", "to=YYYY-MM-DD", "month=YYYY-MM", "company=", "card=", "merchant=",
      "category=", "department=", "tech_group=", "srv_group=", "manual=true|false",
      "min_amount=", "max_amount=", "q=<חיפוש בשם הספק>",
    ],
  });

export const OPTIONS = preflight;
