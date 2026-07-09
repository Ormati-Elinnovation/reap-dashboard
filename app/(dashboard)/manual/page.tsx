import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManualClient from "@/components/ManualClient";

export const dynamic = "force-dynamic";

export default async function ManualPage() {
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
  if (!access?.is_admin) redirect("/");

  return <ManualClient />;
}
