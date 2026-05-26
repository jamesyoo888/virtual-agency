import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Virtual Agency — K-Aesthetic AI Models for Global Brands",
    template: "%s · Virtual Agency",
  },
  description:
    "Production-grade AI virtual models built for global brands tapping K-aesthetic. Cast in 24h, deliver in days, license per campaign.",
  alternates: {
    languages: {
      en: `${SITE_URL}/en`,
      ko: `${SITE_URL}/`,
    },
  },
  openGraph: {
    locale: "en_US",
    siteName: "Virtual Agency",
    type: "website",
  },
};

const YEAR = new Date().getFullYear();

function EnFooter() {
  return (
    <footer className="border-t border-zinc-900 mt-16">
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-500">
        <div>
          <p className="text-zinc-300 font-bold tracking-widest uppercase mb-2">
            Virtual Agency
          </p>
          <p>K-aesthetic AI virtual models for global brands.</p>
          <p className="mt-2">
            © {YEAR} Virtual Agency. All rights reserved.
          </p>
          <p className="mt-3 text-[10px] text-zinc-600">
            All talent is AI-generated synthetic — see{" "}
            <Link
              href="/en/legal/ai-disclosure"
              className="underline hover:text-zinc-300"
            >
              disclosure
            </Link>
            .
          </p>
        </div>

        <div>
          <p className="text-zinc-400 mb-2 font-medium">Product</p>
          <ul className="space-y-1">
            <li>
              <Link href="/en" className="hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link href="/en/pricing" className="hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/en/about" className="hover:text-white">
                About
              </Link>
            </li>
            <li>
              <Link href="/en/blog" className="hover:text-white">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/en/cases" className="hover:text-white">
                Case studies
              </Link>
            </li>
            <li>
              <Link href="/" className="hover:text-white">
                Browse catalog (KR site)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-zinc-400 mb-2 font-medium">Compliance</p>
          <ul className="space-y-1">
            <li>
              <Link href="/en/legal/ai-disclosure" className="hover:text-white">
                AI synthetic content disclosure
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@virtualagency.example.com"
                className="hover:text-white"
              >
                hello@virtualagency.example.com
              </a>
            </li>
            <li className="pt-2 flex gap-2">
              <Link
                href="/en"
                className="rounded border border-zinc-800 px-2 py-0.5 text-zinc-300 bg-zinc-950"
                aria-current="true"
              >
                EN
              </Link>
              <Link
                href="/"
                className="rounded border border-zinc-900 px-2 py-0.5 text-zinc-500 hover:text-white"
              >
                KO
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function EnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <EnFooter />
    </>
  );
}
