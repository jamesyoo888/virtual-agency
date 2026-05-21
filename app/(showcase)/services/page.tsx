import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Video, Layers, Calendar, Palette } from "lucide-react";

export const revalidate = 86400;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "서비스 — Virtual Agency",
  description:
    "이미지 캠페인, 영상 콘텐츠, 룩북, 브랜드 키트, 모델 픽업 — Virtual Agency 의 5가지 핵심 서비스.",
  openGraph: {
    title: "서비스 — Virtual Agency",
    description:
      "이미지 캠페인, 영상 콘텐츠, 룩북, 브랜드 키트, 모델 픽업.",
    url: `${SITE_URL}/services`,
    type: "website" as const,
  },
};

interface Service {
  key: string;
  Icon: typeof ImageIcon;
  title: string;
  tagline: string;
  deliverable: string;
  turnaround: string;
  priceBand: string;
  bullets: string[];
  cta: { label: string; href: string };
}

const SERVICES: Service[] = [
  {
    key: "image",
    Icon: ImageIcon,
    title: "이미지 캠페인",
    tagline: "단일 컨셉 5~10컷, SNS·인쇄·옥외 매체",
    deliverable: "고해상도 JPG/PNG + 매체별 리사이즈 변형",
    turnaround: "24~72시간",
    priceBand: "₩200만~₩800만",
    bullets: [
      "동일 모델·동일 컨셉 일관성 보장",
      "SNS 정사각·세로·가로 자동 변형",
      "1차 컷 컨펌 후 무제한 미세 수정",
      "AI 워터마크 옵션 (방심위/공정위 가이드 준수)",
    ],
    cta: { label: "이미지 캠페인 견적", href: "/rfp" },
  },
  {
    key: "video",
    Icon: Video,
    title: "영상 콘텐츠",
    tagline: "Kling/Minimax 기반 5~30초 광고 영상, 립싱크 지원",
    deliverable: "MP4 1080p 또는 4K + 자막 옵션",
    turnaround: "3~7일",
    priceBand: "₩400만~₩2,000만",
    bullets: [
      "동일 모델 컨셉을 영상에서 유지",
      "립싱크 옵션 (한국어·영어·일본어)",
      "16:9 / 9:16 / 1:1 동시 출력",
      "BGM·자막·로고 통합",
    ],
    cta: { label: "영상 콘텐츠 견적", href: "/rfp" },
  },
  {
    key: "lookbook",
    Icon: Layers,
    title: "룩북 / 시리즈",
    tagline: "동일 모델 4~12컷 시리즈, 패션·뷰티 캠페인 최적",
    deliverable: "스타일링 가이드 + 시리즈 이미지 + 캠페인 카피 초안",
    turnaround: "5~10일",
    priceBand: "₩600만~₩1,500만",
    bullets: [
      "무드 일관성 (cold/warm/edgy) 잠금",
      "스타일링 변형 — 동일 모델·다른 의상",
      "캠페인 카피 1차 초안 동봉",
      "/models/[id]/lookbook 페이지 자동 생성",
    ],
    cta: { label: "룩북 견적", href: "/rfp" },
  },
  {
    key: "fitting",
    Icon: Calendar,
    title: "모델 픽업 데이",
    tagline: "광고주 회의실에서 진행하는 모델 선정·컨셉 워크숍",
    deliverable: "추천 모델 5~10명 + 컨셉 무드보드 + 캠페인 로드맵",
    turnaround: "1~2일 (워크숍 당일)",
    priceBand: "₩150만~₩400만",
    bullets: [
      "운영팀이 광고주 사무실 또는 화상 방문",
      "모델 풀에서 브랜드 fit 우선순위 큐레이션",
      "그 자리에서 시안 1~2컷 즉시 생성 (옵션)",
      "워크숍 후 캠페인 계약 시 비용 차감",
    ],
    cta: { label: "픽업 데이 요청", href: "/match" },
  },
  {
    key: "brand-kit",
    Icon: Palette,
    title: "브랜드 모델 키트",
    tagline: "분기 단위 재사용을 위한 전속 모델 + 컨셉 라이브러리",
    deliverable: "전속 모델 1~3명 + 분기당 신규 컷 50장 + 영상 시리즈",
    turnaround: "초기 14일 셋업 + 분기 갱신",
    priceBand: "₩3,000만~₩1억 / 분기",
    bullets: [
      "동일 모델로 시즌 횡단 광고 가능",
      "독점 라이선스 카테고리 단위 잠금",
      "분기마다 신규 컨셉·룩북 갱신",
      "캠페인 로드맵 컨설팅 (분기 1회)",
    ],
    cta: { label: "브랜드 키트 상담", href: "/rfp" },
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-14">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Services · 서비스
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            5가지 핵심 서비스, <br />
            <span className="text-zinc-400">한 곳에서.</span>
          </h1>
          <p className="mt-5 text-zinc-400 max-w-2xl leading-relaxed">
            이미지·영상·룩북·픽업 데이·브랜드 키트 — 광고주의 캠페인 단계별로
            서비스를 분할 운영합니다. 모두 동일 모델·동일 컨셉 일관성 위에
            구축되어 분기 단위 재사용이 가능합니다.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SERVICES.map((s) => (
            <article
              key={s.key}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-7 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-lg border border-zinc-800 grid place-items-center text-zinc-300">
                  <s.Icon className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-semibold">{s.title}</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-5">{s.tagline}</p>
              <dl className="grid grid-cols-3 gap-3 text-xs mb-5">
                <div>
                  <dt className="text-zinc-600 mb-1">납기</dt>
                  <dd className="text-zinc-200">{s.turnaround}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 mb-1">가격대</dt>
                  <dd className="text-zinc-200">{s.priceBand}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 mb-1">납품물</dt>
                  <dd className="text-zinc-200 leading-snug">{s.deliverable}</dd>
                </div>
              </dl>
              <ul className="space-y-1.5 text-sm text-zinc-300 mb-6 flex-1">
                {s.bullets.map((b) => (
                  <li key={b} className="leading-relaxed">
                    <span className="text-zinc-600 mr-2">·</span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={s.cta.href}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-200 hover:text-white"
              >
                {s.cta.label} <ArrowRight className="w-4 h-4" />
              </Link>
            </article>
          ))}
        </section>

        <footer className="mt-16 pt-8 border-t border-zinc-900 text-center">
          <p className="text-sm text-zinc-300 mb-4">
            서비스 조합이 고민되면 AI 매칭부터 시작해 보세요.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Link
              href="/match"
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-4 py-2 hover:bg-zinc-200"
            >
              AI 매칭 시작 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              가격 보기
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              납품 사례
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
