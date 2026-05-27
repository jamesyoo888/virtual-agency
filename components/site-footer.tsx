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
            <li>
              <Link href="/about" className="hover:text-white">
                회사 소개
              </Link>
            </li>
            <li>
              <Link href="/brief-template" className="hover:text-white">
                브리프 템플릿
              </Link>
            </li>
            <li>
              <Link href="/trending" className="hover:text-white">
                트렌딩 모델
              </Link>
            </li>
            <li>
              <Link href="/character" className="hover:text-white">
                캐릭터
              </Link>
            </li>
            <li>
              <Link href="/character/brand-kits" className="hover:text-white">
                브랜드 키트
              </Link>
            </li>
            <li>
              <Link href="/character/compare" className="hover:text-white">
                캐릭터 비교
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="hover:text-white">
                용어집
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
              <Link href="/legal/ai-disclosure" className="hover:text-white">
                AI 합성 콘텐츠 표기
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
