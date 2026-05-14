import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "@/components/nav-admin";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/admin/models");

    const { data: client } = await supabase
      .from("clients")
      .select("role")
      .eq("id", user.id)
      .single();

    if (client?.role !== "admin") redirect("/client/dashboard");

    userEmail = user.email ?? null;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <NavAdmin userEmail={userEmail} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
