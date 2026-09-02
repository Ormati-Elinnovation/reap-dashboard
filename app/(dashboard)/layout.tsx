import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionsProvider } from "@/components/TransactionsProvider";
import SideNav from "@/components/SideNav";

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
          <h1>Reap</h1>
        </div>
      </div>
      <TransactionsProvider isAdmin={isAdmin}>{children}</TransactionsProvider>
    </div>
  );
}
