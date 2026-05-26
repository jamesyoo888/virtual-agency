import Link from "next/link";
import NewsletterSignup from "@/components/newsletter-signup";

const YEAR = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-900 mt-16">
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-500">
        <div>
          <p className="text-zinc-300 font-bold tracking-widest uppercase mb-2">
            Virtual Agency
          </p>
          <p>?ㅼ젣蹂대떎 ?꾨꼍??AI 踰꾩텛??紐⑤뜽.</p>
          <p className="mt-2">짤 {YEAR} Virtual Agency. All rights reserved.</p>
          <NewsletterSignup />
        </div>

        <div>
          <p className="text-zinc-400 mb-2 font-medium">?쒕퉬??/p>
          <ul className="space-y-1">
            <li>
              <Link href="/" className="hover:text-white">
                移댄깉濡쒓렇
              </Link>
            </li>
            <li>
              <Link href="/match" className="hover:text-white">
                AI 留ㅼ묶
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white">
                ?쒕퉬??
              </Link>
            </li>
            <li>
              <Link href="/compare" className="hover:text-white">
                紐⑤뜽 鍮꾧탳
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/cases" className="hover:text-white">
                ?щ?
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-white">
                釉붾줈洹?
              </Link>
            </li>
            <li>
              <Link href="/press" className="hover:text-white">
                ?꾨젅??
              </Link>
            </li>
            <li>
              <Link href="/careers" className="hover:text-white">
                ?щ━?먯씠???⑸쪟
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">
                ?뚯궗 ?뚭컻
              </Link>
            </li>
            <li>
              <Link href="/brief-template" className="hover:text-white">
                釉뚮━???쒗뵆由?
              </Link>
            </li>
            <li>
              <Link href="/trending" className="hover:text-white">
                ?몃젋??紐⑤뜽
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-zinc-400 mb-2 font-medium">?뺤콉</p>
          <ul className="space-y-1">
            <li>
              <Link href="/legal/terms" className="hover:text-white">
                ?댁슜?쎄?
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-white">
                媛쒖씤?뺣낫 泥섎━諛⑹묠
              </Link>
            </li>
            <li>
              <Link href="/legal/ai-disclosure" className="hover:text-white">
                AI ?⑹꽦 肄섑뀗痢??쒓린
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@aihubs.uk"
                className="hover:text-white"
              >
                hello@aihubs.uk
              </a>
            </li>
            <li className="pt-2 flex gap-2">
              <Link
                href="/"
                className="rounded border border-zinc-800 px-2 py-0.5 text-zinc-300 bg-zinc-950"
                aria-current="true"
              >
                KO
              </Link>
              <Link
                href="/en"
                className="rounded border border-zinc-900 px-2 py-0.5 text-zinc-500 hover:text-white"
              >
                EN
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
