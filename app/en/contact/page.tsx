import { redirect } from "next/navigation";

export const dynamic = "force-static";
export const revalidate = false;

// English mirror of /contact — RFP is the only inbound surface, so redirect
// any organic "contact us" link to the English RFP page.
export default function EnContactRedirect() {
  redirect("/en/rfp");
}
