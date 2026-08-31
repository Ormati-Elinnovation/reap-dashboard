// OpenAPI 3.1 description of the public API, served at /api/v1/openapi.json and
// rendered by the Swagger page at /api-docs. Keep in sync with the route handlers.

const FILTER_PARAMS = [
  "from", "to", "month", "company", "card", "merchant", "q",
  "category", "department", "tech_group", "srv_group", "manual",
  "min_amount", "max_amount",
].map((name) => ({ $ref: `#/components/parameters/${name}` }));

const REPORT_RESPONSE = { $ref: "#/components/schemas/Report" };

function reportPath(operationId: string, summary: string, description: string, tag = "דוחות") {
  return {
    get: {
      operationId,
      tags: [tag],
      summary,
      description,
      parameters: FILTER_PARAMS,
      responses: {
        "200": {
          description: "דוח מקובץ",
          content: { "application/json": { schema: REPORT_RESPONSE } },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "400": { $ref: "#/components/responses/BadRequest" },
      },
    },
  };
}

function strParam(name: string, description: string, example: string, extra: object = {}) {
  return {
    name,
    in: "query",
    description,
    required: false,
    schema: { type: "string", ...extra },
    example,
  };
}

export function buildOpenApiSpec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Reap Expenses API",
      version: "1.0.0",
      description: [
        "API לקריאה בלבד לנתוני ההוצאות של הקבוצה — אותם מספרים שמופיעים בדשבורד.",
        "",
        "**אימות:** כל נקודת קצה (חוץ מ-`GET /`) דורשת מפתח API. לוחצים על **Authorize** למעלה,",
        "מדביקים את המפתח (`reap_…`) ואז אפשר לנסות כל קריאה ישירות מהדף הזה.",
        "",
        "**הרשאות:** לכל מפתח מוגדרות חברות מותרות וכרטיסים חסומים. בקשה לנתונים שמחוץ",
        "להרשאה מחזירה תוצאה ריקה ולא שגיאה. `GET /me` מציגה מה המפתח שלכם מורשה לראות.",
        "",
        "**מטבע:** USD. סכומים מעוגלים לשתי ספרות אחרי הנקודה.",
      ].join("\n"),
      contact: { name: "מנהל המערכת של Reap" },
      license: { name: "Proprietary — שימוש פנימי בלבד", identifier: "LicenseRef-Proprietary" },
    },
    servers: [{ url: `${origin}/api/v1`, description: "Production" }],
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    tags: [
      { name: "מידע כללי", description: "גילוי, הרשאות וערכים לסינון" },
      { name: "דוחות", description: "סכומים ופילוחים מחושבים" },
      { name: "עסקאות", description: "שורות גולמיות" },
    ],
    paths: {
      "/": {
        get: {
          operationId: "listEndpoints",
          tags: ["מידע כללי"],
          summary: "רשימת נקודות הקצה",
          description: "נקודת הקצה היחידה שלא דורשת מפתח. שימושית לבדיקת זמינות.",
          security: [],
          responses: {
            "200": {
              description: "שם ה-API, גרסה, רשימת נקודות הקצה והפילטרים הנתמכים",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/me": {
        get: {
          operationId: "getMe",
          tags: ["מידע כללי"],
          summary: "פרטי המפתח וההרשאות שלו",
          responses: {
            "200": {
              description: "פרטי המפתח",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Me" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
          },
        },
      },
      "/meta": {
        get: {
          operationId: "getFilterValues",
          tags: ["מידע כללי"],
          summary: "ערכים זמינים לסינון",
          description: "חודשים, חברות, כרטיסים, קטגוריות, מחלקות וספקים — לבניית תפריטי בחירה.",
          parameters: FILTER_PARAMS,
          responses: {
            "200": {
              description: "ערכי הסינון",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MetaResponse" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/summary": {
        get: {
          operationId: "getSummary",
          tags: ["דוחות"],
          summary: "סיכום כללי",
          description: "סה\"כ, ממוצע חודשי, פילוח לפי חודש, ספקים מובילים והעסקה הגדולה ביותר.",
          parameters: [
            ...FILTER_PARAMS,
            {
              name: "top",
              in: "query",
              description: "כמה ספקים מובילים להחזיר",
              schema: { type: "integer", default: 10, minimum: 1 },
            },
          ],
          responses: {
            "200": {
              description: "סיכום",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Summary" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/monthly": {
        get: {
          operationId: "getMonthly",
          tags: ["דוחות"],
          summary: "סה\"כ לפי חודש",
          parameters: FILTER_PARAMS,
          responses: {
            "200": {
              description: "פילוח חודשי",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Monthly" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/companies": reportPath("getCompanies", "פילוח לפי חברה", "קיבוץ: חברה ← כרטיס."),
      "/cards": reportPath("getCards", "פילוח לפי כרטיס", "קיבוץ: כרטיס ← ספק."),
      "/suppliers": reportPath("getSuppliers", "פילוח לפי ספק", "קיבוץ: ספק ← כרטיס."),
      "/technology": reportPath("getTechnology", 
        "הוצאות טכנולוגיה",
        "רק שורות עם שיוך טכנולוגי. קיבוץ: קבוצה ← ספק. זהה לטאב Technology בדשבורד."
      ),
      "/servers": reportPath("getServers", 
        "הוצאות שרתים",
        "AWS · AUTOMAT · MongoDB. קיבוץ: ספק ← כרטיס."
      ),
      "/departments": reportPath("getDepartments", "פילוח לפי מחלקה", "רק שורות עם מחלקה. קיבוץ: מחלקה ← ספק."),
      "/transactions": {
        get: {
          operationId: "getTransactions",
          tags: ["עסקאות"],
          summary: "עסקאות גולמיות",
          description:
            "רשימת העסקאות עם עימוד. להמשך קריאה: `offset=next_offset` כל עוד `has_more` הוא true.\n\n" +
            "`format=csv` מחזיר קובץ CSV (עם BOM, נפתח נכון באקסל) במקום JSON.",
          parameters: [
            ...FILTER_PARAMS,
            {
              name: "limit",
              in: "query",
              description: "כמה שורות להחזיר",
              schema: { type: "integer", default: 500, minimum: 1, maximum: 5000 },
            },
            { name: "offset", in: "query", schema: { type: "integer", default: 0, minimum: 0 } },
            {
              name: "sort",
              in: "query",
              schema: {
                type: "string",
                default: "date",
                enum: ["date", "amt", "month", "company", "card", "merchant"],
              },
            },
            { name: "order", in: "query", schema: { type: "string", default: "desc", enum: ["asc", "desc"] } },
            {
              name: "format",
              in: "query",
              description: "csv כדי לקבל קובץ במקום JSON",
              schema: { type: "string", enum: ["json", "csv"], default: "json" },
            },
          ],
          responses: {
            "200": {
              description: "עסקאות",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/TransactionsResponse" } },
                "text/csv": { schema: { type: "string" } },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "הדביקו את המפתח בלבד (בלי המילה Bearer). נשלח ככותרת Authorization.",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "חלופה לכותרת Authorization.",
        },
      },
      parameters: {
        from: strParam("from", "תאריך התחלה (כולל)", "2026-01-01", { format: "date" }),
        to: strParam("to", "תאריך סיום (כולל)", "2026-08-31", { format: "date" }),
        month: strParam("month", "חודש או חודשים, YYYY-MM. אפשר להפריד בפסיקים", "2026-08"),
        company: strParam("company", "חברה. אפשר כמה, מופרדות בפסיקים", "Rain"),
        card: strParam("card", "מספר כרטיס (טקסט — שומר אפסים מובילים)", "0106"),
        merchant: strParam("merchant", "שם ספק, התאמה מדויקת", "AWS EMEA"),
        q: strParam("q", "חיפוש חופשי בשם הספק", "openai"),
        category: strParam("category", "קטגוריה", "Subscription"),
        department: strParam("department", "מחלקה", "טכנולוגיה"),
        tech_group: strParam("tech_group", "קבוצת טכנולוגיה", "AI/API infra"),
        srv_group: strParam("srv_group", "קבוצת שרתים", "AWS"),
        manual: {
          name: "manual",
          in: "query",
          description: "true = רק הוצאות ידניות · false = רק הוצאות Reap",
          schema: { type: "boolean" },
        },
        min_amount: {
          name: "min_amount",
          in: "query",
          description: "סכום מינימלי",
          schema: { type: "number" },
        },
        max_amount: {
          name: "max_amount",
          in: "query",
          description: "סכום מקסימלי",
          schema: { type: "number" },
        },
      },
      responses: {
        BadRequest: {
          description: "פרמטר שגוי",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        Unauthorized: {
          description: "מפתח חסר או לא תקין",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        Forbidden: {
          description: "המפתח הושבת או פג תוקפו",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  enum: [
                    "missing_api_key", "invalid_api_key", "key_disabled",
                    "key_expired", "bad_request", "internal_error",
                  ],
                },
                message: { type: "string" },
              },
            },
          },
          example: { error: { code: "invalid_api_key", message: "מפתח API לא תקין" } },
        },
        Meta: {
          type: "object",
          description: "מוחזר בכל תשובה — הסינון שהופעל בפועל",
          properties: {
            generated_at: { type: "string", format: "date-time" },
            key: { type: "string", description: "שם המפתח" },
            currency: { type: "string", const: "USD" },
            filters: { type: "object", additionalProperties: true },
          },
        },
        Totals: {
          type: "object",
          properties: {
            total: { type: "number", example: 219844.9 },
            transactions: { type: "integer", example: 962 },
            months: { type: "integer", example: 8 },
            monthly_avg: { type: "number", example: 248660.69 },
            companies: { type: "integer" },
            cards: { type: "integer" },
            suppliers: { type: "integer" },
            currency: { type: "string", const: "USD" },
          },
        },
        MonthMeta: {
          type: "object",
          properties: {
            month: { type: "string", example: "2026-08" },
            label: { type: "string", example: "אוגוסט" },
            partial: { type: "boolean", description: "חודש שטרם הסתיים — לא לכלול בממוצעים" },
          },
        },
        MonthBucket: {
          allOf: [
            { $ref: "#/components/schemas/MonthMeta" },
            {
              type: "object",
              properties: { total: { type: "number" }, transactions: { type: "integer" } },
            },
          ],
        },
        GroupItem: {
          type: "object",
          description: "שורת משנה בפילוח (למשל כרטיס בתוך חברה)",
          properties: {
            key: { type: "string" },
            holder: { type: "string" },
            company: { type: "string" },
            total: { type: "number" },
            transactions: { type: "integer" },
            monthly_avg: { type: "number" },
            by_month: { type: "object", additionalProperties: { type: "number" } },
          },
        },
        Group: {
          type: "object",
          properties: {
            key: { type: "string", example: "Rain" },
            total: { type: "number" },
            transactions: { type: "integer" },
            monthly_avg: { type: "number" },
            by_month: { type: "object", additionalProperties: { type: "number" } },
            items: { type: "array", items: { $ref: "#/components/schemas/GroupItem" } },
          },
        },
        Report: {
          type: "object",
          properties: {
            meta: { $ref: "#/components/schemas/Meta" },
            totals: { $ref: "#/components/schemas/Totals" },
            months: { type: "array", items: { $ref: "#/components/schemas/MonthMeta" } },
            by_month: { type: "array", items: { $ref: "#/components/schemas/MonthBucket" } },
            groups: { type: "array", items: { $ref: "#/components/schemas/Group" } },
          },
        },
        Monthly: {
          type: "object",
          properties: {
            meta: { $ref: "#/components/schemas/Meta" },
            totals: { $ref: "#/components/schemas/Totals" },
            by_month: { type: "array", items: { $ref: "#/components/schemas/MonthBucket" } },
          },
        },
        Summary: {
          type: "object",
          properties: {
            meta: { $ref: "#/components/schemas/Meta" },
            totals: { $ref: "#/components/schemas/Totals" },
            months: { type: "array", items: { $ref: "#/components/schemas/MonthMeta" } },
            by_month: { type: "array", items: { $ref: "#/components/schemas/MonthBucket" } },
            largest_transaction: {
              type: ["object", "null"],
              properties: {
                date: { type: "string", format: "date" },
                company: { type: "string" },
                card: { type: "string" },
                merchant: { type: "string" },
                amount: { type: "number" },
              },
            },
            top_suppliers: { type: "array", items: { $ref: "#/components/schemas/Group" } },
            by_company: { type: "array", items: { $ref: "#/components/schemas/Group" } },
          },
        },
        Me: {
          type: "object",
          properties: {
            key: { type: "string", example: "מערכת המשרד" },
            access: {
              type: "object",
              properties: {
                all_companies: { type: "boolean" },
                companies: {
                  oneOf: [{ type: "string", const: "all" }, { type: "array", items: { type: "string" } }],
                },
                denied_cards: { type: "array", items: { type: "string" } },
              },
            },
            permissions: { type: "array", items: { type: "string" }, example: ["read"] },
          },
        },
        MetaResponse: {
          type: "object",
          properties: {
            meta: { $ref: "#/components/schemas/Meta" },
            months: { type: "array", items: { $ref: "#/components/schemas/MonthMeta" } },
            date_range: {
              type: ["object", "null"],
              properties: { from: { type: "string", format: "date" }, to: { type: "string", format: "date" } },
            },
            companies: { type: "array", items: { type: "string" } },
            cards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  card: { type: "string" },
                  holder: { type: "string" },
                  company: { type: "string" },
                },
              },
            },
            categories: { type: "array", items: { type: "string" } },
            departments: { type: "array", items: { type: "string" } },
            tech_groups: { type: "array", items: { type: "string" } },
            server_groups: { type: "array", items: { type: "string" } },
            suppliers: { type: "array", items: { type: "string" } },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "integer", example: 11496 },
            date: { type: "string", format: "date", example: "2026-08-10" },
            month: { type: "string", example: "2026-08" },
            ts: { type: ["string", "null"] },
            tid: { type: ["string", "null"] },
            company: { type: "string", example: "Mezada" },
            card: { type: "string", example: "6243" },
            holder: { type: "string", example: "Or Matityahu" },
            merchant: { type: "string", example: "OPENROUTER, INC" },
            cat: { type: ["string", "null"], example: "Subscription" },
            amt: { type: "number", example: 27584.57 },
            status: { type: ["string", "null"], example: "CLEARED" },
            srv_group: { type: ["string", "null"], description: "AWS · AUTOMAT · MongoDB" },
            tech_supplier: { type: ["string", "null"], example: "OpenRouter" },
            tech_group: { type: ["string", "null"], example: "AI/API infra" },
            department: { type: ["string", "null"] },
            manual: { type: "boolean", description: "true = הוצאה שהוזנה ידנית, לא מ-Reap" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            returned: { type: "integer" },
            has_more: { type: "boolean" },
            next_offset: { type: ["integer", "null"] },
          },
        },
        TransactionsResponse: {
          type: "object",
          properties: {
            meta: { $ref: "#/components/schemas/Meta" },
            pagination: { $ref: "#/components/schemas/Pagination" },
            sort: {
              type: "object",
              properties: { field: { type: "string" }, order: { type: "string" } },
            },
            data: { type: "array", items: { $ref: "#/components/schemas/Transaction" } },
          },
        },
      },
    },
  };
}
