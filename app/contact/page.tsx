import { redirect } from "next/navigation";

export const dynamic = "force-static";
export const revalidate = false;

// /contact is a high-intent organic URL. We don't have a generic contact form
// — RFP is the single inbound surface — so redirect rather than 404. Keeps
// link equity from any external "contact us" anchor pointing here.
export default function ContactRedirect() {
  redirect("/rfp");
}
