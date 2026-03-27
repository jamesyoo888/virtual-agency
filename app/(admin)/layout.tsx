import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "@/components/nav-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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


  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <NavAdmin />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
