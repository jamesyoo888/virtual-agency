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
          <p>실제보다 완벽한 AI 버추얼 모델.</p>
          <p className="mt-2">© {YEAR} Virtual Agency. All rights reserved.</p>
          <NewsletterSignup />
        </div>

        <div>
          <p className="text-zinc-400 mb-2 font-medium">서비스</p>
          <ul className="space-y-1">
            <li>
              <Link href="/" className="hover:text-white">
                카탈로그
              </Link>
            </li>
            <li>
              <Link href="/match" className="hover:text-white">
                AI 매칭
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-white">
                서비스
              </Link>
            </li>
            <li>
              <Link href="/compare" className="hover:text-white">
                모델 비교
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/cases" className="hover:text-white">
                사례
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-white">
                블로그
              </Link>
            </li>
            <li>
              <Link href="/press" className="hover:text-white">
                프레스
              </Link>
            </li>
            <li>
              <Link href="/careers" className="hover:text-white">
                크리에이터 합류
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-zinc-400 mb-2 font-medium">정책</p>
          <ul className="space-y-1">
            <li>
              <Link href="/legal/terms" className="hover:text-white">
                이용약관
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-white">
                개인정보 처리방침
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
          </ul>
        </div>
      </div>
    </footer>
  );
}
