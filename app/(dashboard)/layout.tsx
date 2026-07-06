import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllTransactions, fetchTechMap } from "@/lib/data";
import { TransactionsProvider } from "@/components/TransactionsProvider";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";
import RefreshButton from "@/components/RefreshButton";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: access } = await supabase
    .from("user_access")
    .select("is_admin,all_companies,companies,denied_cards")
    .eq("email", user.email?.toLowerCase() ?? "")
    .maybeSingle();
  const isAdmin = !!access?.is_admin;

  let tx = [] as Awaited<ReturnType<typeof fetchAllTransactions>>;
  let techMap = {} as Awaited<ReturnType<typeof fetchTechMap>>;
  let loadError: string | null = null;
  try {
    [tx, techMap] = await Promise.all([fetchAllTransactions(supabase), fetchTechMap(supabase)]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const header = (
    <div className="hdr">
      <h1>Reap — הוצאות</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <RefreshButton />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );

  if (loadError || tx.length === 0) {
    const noPerm = !loadError && !isAdmin;
    return (
      <div className="wrap">
        {header}
        <Nav isAdmin={isAdmin} />
        <div className="card" style={{ marginTop: 12 }}>
          <div className="lbl">{noPerm ? "אין הרשאות צפייה" : "הנתונים עדיין לא נטענו"}</div>
          <p className="sub" style={{ marginTop: 8 }}>
            {loadError
              ? "טבלת הנתונים עדיין לא קיימת ב-Supabase. יש להריץ את סכימת ה-SQL ואז את טעינת הנתונים (npm run seed:reset)."
              : noPerm
              ? "המשתמש שלך עדיין לא קיבל הרשאות צפייה לחברות/כרטיסים. פנה למנהל המערכת."
              : "הטבלה קיימת אך ריקה — יש להריץ את טעינת הנתונים (npm run seed:reset)."}
          </p>
          {loadError && <p className="muted" style={{ fontSize: 12 }}>{loadError}</p>}
        </div>
      </div>
    );
  }

  return (
    <TransactionsProvider tx={tx} techMap={techMap}>
      <div className="wrap">
        {header}
        <Nav isAdmin={isAdmin} />
        {children}
      </div>
    </TransactionsProvider>
  );
}
