import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionsProvider } from "@/components/TransactionsProvider";
import Nav from "@/components/Nav";
import SideNav from "@/components/SideNav";
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
    .select("is_admin")
    .eq("email", user.email?.toLowerCase() ?? "")
    .maybeSingle();
  const isAdmin = !!access?.is_admin;

  return (
    <div className="wrap">
      <div className="hdr">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SideNav isAdmin={isAdmin} />
          <h1>Reap — הוצאות</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <RefreshButton />
          <Link href="/account" className="btn">🔑 סיסמה</Link>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
      <Nav isAdmin={isAdmin} />
      <TransactionsProvider isAdmin={isAdmin}>{children}</TransactionsProvider>
    </div>
  );
}
