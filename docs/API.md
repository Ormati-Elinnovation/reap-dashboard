# Reap Expenses API (v1)

API לקריאה בלבד (read-only) לנתוני דשבורד ההוצאות. מיועד לחיבור מערכות חיצוניות —
כל מה שמוצג בדשבורד זמין גם כאן, עם אותם חישובים בדיוק.

- **Base URL:** `https://<כתובת-הדשבורד>/api/v1`
- **מטבע:** USD
- **פורמט:** JSON (ל-`/transactions` יש גם CSV)

## אימות

כל בקשה (חוץ מ-`GET /api/v1`) דורשת מפתח API:

```bash
curl -H "Authorization: Bearer reap_xxxxxxxx" https://<host>/api/v1/summary
```

חלופות: כותרת `x-api-key: reap_xxxxxxxx`, או `?api_key=` בשורת הכתובת (פחות בטוח — נשמר בלוגים).

**יצירת מפתח:** דשבורד → 🔐 ניהול הרשאות → 🔌 מפתחות API → "צור מפתח".
המפתח מוצג פעם אחת בלבד. לכל מפתח אפשר להגדיר אילו חברות מותרות, אילו כרטיסים חסומים,
ותאריך תפוגה. אפשר להשבית או למחוק מפתח בכל רגע.

מפתח מוגבל פשוט לא יראה נתונים מחוץ להרשאתו (מקבל תוצאה ריקה, לא שגיאה).

### שגיאות

| קוד | HTTP | משמעות |
|---|---|---|
| `missing_api_key` | 401 | לא נשלח מפתח |
| `invalid_api_key` | 401 | מפתח לא מוכר |
| `key_disabled` / `key_expired` | 403 | המפתח הושבת / פג תוקף |
| `bad_request` | 400 | פרמטר שגוי (ההודעה מפרטת) |
| `internal_error` | 500 | תקלה בשרת |

```json
{ "error": { "code": "invalid_api_key", "message": "מפתח API לא תקין" } }
```

## נקודות קצה

| Endpoint | מה מחזיר |
|---|---|
| `GET /api/v1` | רשימת נקודות הקצה (ללא מפתח) |
| `GET /api/v1/me` | פרטי המפתח וההרשאות שלו |
| `GET /api/v1/meta` | ערכים זמינים לסינון: חודשים, חברות, כרטיסים, קטגוריות, מחלקות, ספקים |
| `GET /api/v1/summary` | סיכום: סה"כ, ממוצע חודשי, פילוח לפי חודש, ספקים מובילים, עסקה גדולה |
| `GET /api/v1/monthly` | סה"כ ומספר עסקאות לכל חודש |
| `GET /api/v1/companies` | חברה → כרטיס |
| `GET /api/v1/cards` | כרטיס → ספק |
| `GET /api/v1/suppliers` | ספק → כרטיס |
| `GET /api/v1/technology` | הוצאות טכנולוגיה: קבוצה → ספק (כמו טאב Technology) |
| `GET /api/v1/servers` | שרתים: AWS / AUTOMAT / MongoDB |
| `GET /api/v1/departments` | מחלקה → ספק |
| `GET /api/v1/transactions` | עסקאות גולמיות, עם עימוד |

## פרמטרים לסינון

תקפים בכל נקודות הקצה. ניתן לחזור על פרמטר או להפריד בפסיקים:
`?company=Rain&company=Hodlr` שקול ל-`?company=Rain,Hodlr`.

| פרמטר | דוגמה | הסבר |
|---|---|---|
| `from`, `to` | `from=2026-01-01&to=2026-03-31` | טווח תאריכים (כולל) |
| `month` | `month=2026-08` | חודש/חודשים (YYYY-MM) |
| `company` | `company=Rain` | חברה |
| `card` | `card=6243` | כרטיס (טקסט — שומר אפסים מובילים) |
| `merchant` | `merchant=AWS EMEA` | ספק, התאמה מדויקת |
| `q` | `q=openai` | חיפוש חופשי בשם הספק |
| `category` | `category=Subscription` | קטגוריה |
| `department` | `department=טכנולוגיה` | מחלקה |
| `tech_group` | `tech_group=AI/API infra` | קבוצת טכנולוגיה |
| `srv_group` | `srv_group=AWS` | קבוצת שרתים |
| `manual` | `manual=true` | רק הוצאות ידניות / רק Reap |
| `min_amount`, `max_amount` | `min_amount=1000` | טווח סכומים |

**רק ל-`/transactions`:** `limit` (ברירת מחדל 500, מקסימום 5000), `offset`,
`sort` (`date`\|`amt`\|`month`\|`company`\|`card`\|`merchant`), `order` (`asc`\|`desc`), `format=csv`.
**רק ל-`/summary`:** `top` (כמה ספקים מובילים, ברירת מחדל 10).

## מבנה התשובה

לכל תשובה יש בלוק `meta` שמחזיר את הסינון שהופעל בפועל:

```json
{
  "meta": {
    "generated_at": "2026-08-31T12:54:25.920Z",
    "key": "מערכת הנהלת חשבונות",
    "currency": "USD",
    "filters": { "months": ["2026-08"] }
  }
}
```

### דוח מקובץ (`/companies`, `/cards`, `/suppliers`, `/technology`, `/servers`, `/departments`)

```json
{
  "meta": { },
  "totals": {
    "total": 1989285.48, "transactions": 7571, "months": 8, "monthly_avg": 248660.69,
    "companies": 7, "cards": 50, "suppliers": 1265, "currency": "USD"
  },
  "months": [{ "month": "2026-08", "label": "אוגוסט", "partial": false }],
  "by_month": [{ "month": "2026-08", "label": "אוגוסט", "total": 219844.9, "transactions": 962, "partial": false }],
  "groups": [
    {
      "key": "Rain",
      "total": 812345.67, "transactions": 2100, "monthly_avg": 101543.21,
      "by_month": { "2026-08": 98123.45 },
      "items": [
        { "key": "7778", "holder": "Or Matityahu", "total": 120000, "transactions": 310,
          "monthly_avg": 15000, "by_month": { "2026-08": 14000 } }
      ]
    }
  ]
}
```

`partial: true` מסמן חודש חלקי (החודש הנוכחי טרם הסתיים) — כדאי להתעלם ממנו בחישובי ממוצע.

### `/transactions`

```json
{
  "meta": { },
  "pagination": { "total": 962, "limit": 500, "offset": 0, "returned": 500,
                  "has_more": true, "next_offset": 500 },
  "sort": { "field": "date", "order": "desc" },
  "data": [
    { "id": 11496, "date": "2026-08-10", "month": "2026-08", "company": "Mezada",
      "card": "6243", "holder": "Or Matityahu", "merchant": "OPENROUTER, INC",
      "cat": "Subscription", "amt": 27584.57, "status": "CLEARED",
      "srv_group": null, "tech_supplier": "OpenRouter", "tech_group": "AI/API infra",
      "department": null, "manual": false }
  ]
}
```

עימוד: המשיכו לקרוא עם `offset=next_offset` כל עוד `has_more` הוא `true`.

## דוגמאות

```bash
# סיכום כללי
curl -H "Authorization: Bearer $KEY" https://<host>/api/v1/summary

# הוצאות רבעון לפי חברה
curl -H "Authorization: Bearer $KEY" \
  "https://<host>/api/v1/companies?from=2026-07-01&to=2026-09-30"

# כל עסקאות ה-AI של אוגוסט
curl -H "Authorization: Bearer $KEY" \
  "https://<host>/api/v1/transactions?month=2026-08&tech_group=AI/API%20infra"

# ייצוא CSV לאקסל
curl -H "Authorization: Bearer $KEY" \
  "https://<host>/api/v1/transactions?month=2026-08&format=csv" -o august.csv
```

```javascript
// Node / Next.js — תמיד מהשרת, לא מהדפדפן (המפתח לא אמור להיחשף ללקוח)
const res = await fetch("https://<host>/api/v1/summary?month=2026-08", {
  headers: { Authorization: `Bearer ${process.env.REAP_API_KEY}` },
});
const { totals, by_month } = await res.json();
```

```python
import requests
r = requests.get(
    "https://<host>/api/v1/suppliers",
    headers={"Authorization": f"Bearer {KEY}"},
    params={"from": "2026-01-01", "to": "2026-08-31"},
    timeout=30,
)
r.raise_for_status()
for g in r.json()["groups"][:10]:
    print(g["key"], g["total"])
```

## הערות תפעוליות

- **קריאה בלבד.** אין דרך לשנות נתונים דרך ה-API.
- **המפתח הוא סוד.** יש להשתמש בו מצד השרת של המערכת הצורכת (משתנה סביבה), לא בקוד דפדפן.
- **CORS:** פתוח כברירת מחדל. כדי להגביל לדומיינים מוכרים, הגדירו משתנה סביבה
  `API_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`.
- **מפתח שנחשף:** מוחקים אותו במסך הניהול ויוצרים חדש. הפעולה מיידית.
- **גודל תשובה:** נקודות הקצה המקובצות מסכמות את כל העסקאות שבתחום ההרשאה —
  לקריאות תכופות עדיף לסנן לפי חודש/טווח תאריכים.
- **CLI:** אפשר גם ליצור מפתח מהטרמינל:
  `npx tsx scripts/create-api-key.ts "שם" --companies=Rain,Hodlr --deny-cards=1356 --expires=2027-01-01`
