import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavClient from "@/components/nav-client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let clientData = null;

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/client/dashboard");

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", user.id)
      .single();

    clientData = client;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <NavClient client={clientData} />
      <main className="max-w-5xl mx-auto px-8 py-8">{children}</main>
    </div>
  );
}
