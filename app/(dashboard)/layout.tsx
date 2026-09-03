import { TransactionsProvider } from "@/components/TransactionsProvider";
import SideNav from "@/components/SideNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = true;

  return (
    <div className="wrap">
      <div className="hdr">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SideNav isAdmin={isAdmin} />
          <h1 style={{ margin: 0 }}><a href="/" style={{ color: "inherit", textDecoration: "none" }}>הוצאות כרטיסי אשראי</a></h1>
        </div>
      </div>
      <TransactionsProvider isAdmin={isAdmin}>{children}</TransactionsProvider>
    </div>
  );
}
