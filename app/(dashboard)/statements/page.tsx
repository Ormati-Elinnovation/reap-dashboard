import { createClient } from "@/lib/supabase/server";
import { listStatements } from "@/lib/statements";
import { monthLabel } from "@/lib/months";
import { fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

type Tot = { n: number; sum: number };

async function dbTotals(months: string[]): Promise<Map<string, Tot>> {
  // month|company → totals, fetched in pages (PostgREST caps a single response).
  const supabase = await createClient();
  const totals = new Map<string, Tot>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("month, company, amt")
      .in("month", months)
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    for (const r of data) {
      const k = `${r.month}|${r.company}`;
      const t = totals.get(k) ?? { n: 0, sum: 0 };
      t.n += 1;
      t.sum += Number(r.amt) || 0;
      totals.set(k, t);
    }
    if (data.length < PAGE) break;
  }
  return totals;
}

function fmtSize(b: number): string {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

export default async function StatementsPage() {
  const disk = listStatements();
  const totals = await dbTotals(disk.map((m) => m.month));

  return (
    <>
      <h2 style={{ margin: "18px 0 10px" }}>📄 דפי חשבון (Statements)</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        קבצי המקור של Reap לפי חודש — CSV של העסקאות ו-PDF של דף ה-Reap Pay, לצד מה שמוזן בפועל בדשבורד.
      </p>

      {disk.length === 0 && <div className="card">אין קבצי דפי חשבון בריפו.</div>}

      {disk.map(({ month, files }) => {
        const companies = Array.from(new Set(files.map((f) => f.company))).sort((a, b) =>
          a.localeCompare(b)
        );
        return (
          <div key={month} className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 10px" }}>
              {monthLabel(month)} {month.slice(0, 4)} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({month})</span>
            </h3>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>חברה</th>
                    <th>CSV עסקאות</th>
                    <th>PDF ‏Reap Pay</th>
                    <th>עסקאות בדשבורד</th>
                    <th>סכום בדשבורד</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => {
                    const csv = files.find((f) => f.company === c && f.kind === "csv");
                    const pdf = files.find((f) => f.company === c && f.kind === "pdf");
                    const t = totals.get(`${month}|${c}`);
                    return (
                      <tr key={c}>
                        <td>{c}</td>
                        <td>
                          {csv ? (
                            <a href={`/statements/${csv.file}`} target="_blank" rel="noreferrer">
                              ⬇️ הורדה ({fmtSize(csv.size)})
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {pdf ? (
                            <a href={`/statements/${pdf.file}`} target="_blank" rel="noreferrer">
                              📄 צפייה ({fmtSize(pdf.size)})
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td>{t ? t.n : <span style={{ color: "var(--muted)" }}>0</span>}</td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {t ? `$${fmt(t.sum)}` : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
