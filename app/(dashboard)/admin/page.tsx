import AdminClient from "@/components/AdminClient";
import ApiKeysClient from "@/components/ApiKeysClient";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <>
      <AdminClient currentEmail="" />
      <ApiKeysClient />
    </>
  );
}
