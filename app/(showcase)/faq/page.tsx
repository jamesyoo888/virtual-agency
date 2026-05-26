import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { faqPageLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "FAQ — Virtual Agency",
  description:
    "라이선스·가격·제작 기간·사용 범위·환불 등 자주 묻는 질문.",
  openGraph: {
    title: "FAQ — Virtual Agency",
    description: "AI 버추얼 모델·라이선스·납기·결제에 대한 답변.",
    url: `${SITE_URL}/faq`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?faq=1`],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "FAQ — Virtual Agency",
    description: "AI 버추얼 모델·라이선스·납기·결제에 대한 답변.",
    images: [`${SITE_URL}/api/og?faq=1`],
  },
};

interface QA {
  q: string;
  a: React.ReactNode;
  /**
   * Plain-text mirror of the answer, fed into the FAQPage JSON-LD. We can't
   * stringify React nodes reliably, and Google rejects nested markup inside
   * the structured-data answer anyway.
   */
  aText: string;
}

const FAQ: QA[] = [
  {
    q: "버추얼 모델의 가격은 어떻게 책정되나요?",
    a: (
      <p>
        각 모델 카드에 일일 단가가 표시됩니다. 5일 이상 5%, 10일 이상 10%,
        30일 이상 15%의 자동 할인이 적용됩니다. 모델 상세 페이지의 견적
        계산기에서 즉시 견적을 확인할 수 있으며, 최종 견적은 24시간 이내
        문의 회신으로 확정됩니다.
      </p>
    ),
    aText:
      "각 모델 카드에 일일 단가가 표시됩니다. 5일 이상 5%, 10일 이상 10%, 30일 이상 15%의 자동 할인이 적용됩니다. 모델 상세 페이지의 견적 계산기에서 즉시 견적을 확인할 수 있으며, 최종 견적은 24시간 이내 회신으로 확정됩니다.",
  },
  {
    q: "독점 라이선스와 비독점은 무엇이 다른가요?",
    a: (
      <p>
        독점은 계약 기간 동안 동일 산업 내 경쟁사가 같은 모델을 사용할 수
        없도록 잠금합니다. 단가는 비독점 대비 3~5배이며, 모델이 브랜드
        아이덴티티의 일부가 되는 경우에 적합합니다. 비독점은 보다 저렴하고
        다른 캠페인과 동시 운영이 가능합니다.
      </p>
    ),
    aText:
      "독점은 계약 기간 동안 동일 산업 내 경쟁사가 같은 모델을 사용할 수 없도록 잠금합니다. 단가는 비독점 대비 3~5배이며, 모델이 브랜드 아이덴티티의 일부가 되는 경우에 적합합니다. 비독점은 보다 저렴하고 다른 캠페인과 동시 운영이 가능합니다.",
  },
  {
    q: "제작 기간은 얼마나 걸리나요?",
    a: (
      <p>
        이미지·룩북: 평균 2~3 영업일. 영상 (5~30초): 평균 3~5 영업일. 3D
        에셋·립싱크: 5~7 영업일. 모든 단계 — 문의 → 브리프 → 제작 → 검수
        → 납품 — 가 5단계로 진행되며, 클라이언트 대시보드에서 실시간 진행
        률을 확인할 수 있습니다.
      </p>
    ),
    aText:
      "이미지·룩북: 평균 2~3 영업일. 영상 (5~30초): 평균 3~5 영업일. 3D 에셋·립싱크: 5~7 영업일. 모든 단계는 클라이언트 대시보드에서 실시간 진행률을 확인할 수 있습니다.",
  },
  {
    q: "AI 매칭 추천은 어떻게 작동하나요?",
    a: (
      <p>
        <Link href="/match" className="underline hover:text-white">
          AI 매칭 페이지
        </Link>
        에서 광고 컨셉을 자유롭게 입력하거나 산업·장르·분위기·예산을
        선택하시면, 룰 기반 점수(산업 35pt · 장르 25pt · 분위기 20pt ·
        예산 보너스 + 인기도 가중치)로 모델을 정렬합니다. 각 추천에는
        점수 근거가 함께 표시되어 의사결정에 활용할 수 있습니다.
      </p>
    ),
    aText:
      "/match 페이지에서 광고 컨셉을 자유롭게 입력하거나 산업·장르·분위기·예산을 선택하시면, 룰 기반 점수(산업 35pt, 장르 25pt, 분위기 20pt, 예산 보너스 + 인기도 가중치)로 모델을 정렬합니다.",
  },
  {
    q: "어디까지 사용 가능한가요? 사용 범위가 궁금합니다.",
    a: (
      <p>
        라이선스에 명시된 매체(SNS·옥외광고·인쇄·웹 등), 지역, 기간
        이내에서 사용 가능합니다. 딥페이크, 성적 콘텐츠, 정치 캠페인, 실존
        인물 사칭 등의 용도는 모두{" "}
        <Link href="/legal/terms" className="underline hover:text-white">
          이용약관
        </Link>
        의 조항에 따라 금지됩니다.
      </p>
    ),
    aText:
      "라이선스에 명시된 매체(SNS·옥외광고·인쇄·웹 등), 지역, 기간 이내에서 사용 가능합니다. 딥페이크, 성적 콘텐츠, 정치 캠페인, 실존 인물 사칭 등의 용도는 모두 이용약관의 조항에 따라 금지됩니다.",
  },
  {
    q: "환불 정책은 어떻게 되나요?",
    a: (
      <p>
        제작 착수 이전에는 전액 환불. 제작 단계별로 진행된 비율만큼
        차감하여 환불합니다. 최종 납품 후에는 환불이 불가능합니다.
      </p>
    ),
    aText:
      "제작 착수 이전에는 전액 환불. 제작 단계별로 진행된 비율만큼 차감하여 환불합니다. 최종 납품 후에는 환불이 불가능합니다.",
  },
  {
    q: "수정·재제작 횟수에 제한이 있나요?",
    a: (
      <p>
        기본 패키지: 검수 단계에서 2회 무료 수정 포함. 추가 수정은 회당
        50,000~150,000원 (모델·복잡도에 따라). 컨셉 변경 또는 본질적인
        재작업은 별도 견적입니다.
      </p>
    ),
    aText:
      "기본 패키지: 검수 단계에서 2회 무료 수정 포함. 추가 수정은 회당 50,000~150,000원 (모델·복잡도에 따라). 컨셉 변경 또는 본질적인 재작업은 별도 견적입니다.",
  },
  {
    q: "3D 모델·영상 립싱크도 가능한가요?",
    a: (
      <p>
        가능합니다. 모델 생성 단계에서 자동으로 3D 메시 (Meshy AI,
        GLB/FBX)가 생성되며, 영상 제작 시 립싱크 (Sync AI) 옵션도 추가할
        수 있습니다. 각각 별도 견적 단가가 적용됩니다.
      </p>
    ),
    aText:
      "가능합니다. 모델 생성 단계에서 자동으로 3D 메시 (Meshy AI, GLB/FBX)가 생성되며, 영상 제작 시 립싱크 (Sync AI) 옵션도 추가할 수 있습니다.",
  },
  {
    q: "초상권·저작권 문제는 없나요?",
    a: (
      <p>
        모든 모델은 AI로 생성된 가공 인물로, 실존 인물의 외모를 모방하지
        않도록 설계됩니다. 모델 자산의 저작권은 회사가 보유하며, 라이선스
        범위 내에서 클라이언트가 사용할 수 있습니다.
      </p>
    ),
    aText:
      "모든 모델은 AI로 생성된 가공 인물로, 실존 인물의 외모를 모방하지 않도록 설계됩니다. 모델 자산의 저작권은 회사가 보유하며, 라이선스 범위 내에서 클라이언트가 사용할 수 있습니다.",
  },
  {
    q: "비용 cap 같은 안전장치가 있나요?",
    a: (
      <p>
        관리자 시스템에 4단계 (경고·중단·일일·월간) 비용 cap이 적용되어
        있어 AI 추론 비용 폭증을 사전 차단합니다. 클라이언트 측에는 영향이
        없습니다.
      </p>
    ),
    aText:
      "관리자 시스템에 4단계 (경고·중단·일일·월간) 비용 cap이 적용되어 있어 AI 추론 비용 폭증을 사전 차단합니다.",
  },
  {
    q: "캠페인 운영 중 모델을 추가 컷으로 확장할 수 있나요?",
    a: (
      <p>
        가능합니다. 같은 모델·같은 라이선스 범위 내에서는 추가 컷이 신규
        제작 대비 30~50% 할인됩니다. 분기 단위로 시리즈를 계속 확장하는
        광고주들에게 가장 ROI가 좋은 패턴이며,{" "}
        <Link
          href="/blog/measuring-virtual-model-campaign-roi"
          className="underline hover:text-white"
        >
          ROI 측정 글
        </Link>
        의 Stage 4 (재구매)에서 자세히 다룹니다.
      </p>
    ),
    aText:
      "가능합니다. 같은 모델·같은 라이선스 범위 내에서는 추가 컷이 신규 제작 대비 30~50% 할인됩니다.",
  },
  {
    q: "여러 모델을 비교해서 한 번에 결정하고 싶어요.",
    a: (
      <p>
        카탈로그에서 최대 4명까지 컴페어 트레이에 담을 수 있고,{" "}
        <Link href="/compare" className="underline hover:text-white">
          /compare
        </Link>
        에서 가격·산업·분위기·포트폴리오를 나란히 볼 수 있습니다. 매칭
        점수 기반의 자동 정렬을 원하시면{" "}
        <Link href="/match" className="underline hover:text-white">
          AI 매칭
        </Link>
        을 사용하세요.
      </p>
    ),
    aText:
      "카탈로그에서 최대 4명까지 컴페어 트레이에 담을 수 있고, /compare에서 가격·산업·분위기·포트폴리오를 나란히 볼 수 있습니다.",
  },
  {
    q: "광고주가 아니라 크리에이터 모델로 합류하고 싶습니다.",
    a: (
      <p>
        로그인 후{" "}
        <Link href="/creator/onboard" className="underline hover:text-white">
          /creator/onboard
        </Link>
        에서 지원할 수 있습니다. 포트폴리오 URL·SNS 핸들·간단한 소개를
        제출하시면 관리자 검수 (보통 2~3 영업일) 후 안내드립니다.
      </p>
    ),
    aText:
      "로그인 후 /creator/onboard에서 지원할 수 있습니다. 포트폴리오 URL·SNS 핸들·간단한 소개를 제출하시면 관리자 검수 후 안내드립니다.",
  },
  {
    q: "회사 결제 부서에서 부가세 포함 견적이 필요해요.",
    a: (
      <p>
        모든 견적·라이선스 단가는 부가세 별도 표기이며, 정식 견적서는
        부가세 포함 금액으로 발행됩니다. 사업자 등록증·세금계산서 발행
        정보를 문의 시 함께 보내주시면 견적 단계에서 바로 반영합니다.
      </p>
    ),
    aText:
      "모든 견적·라이선스 단가는 부가세 별도 표기이며, 정식 견적서는 부가세 포함 금액으로 발행됩니다.",
  },
  {
    q: "글로벌 캠페인에도 사용 가능한가요?",
    a: (
      <p>
        기본 라이선스는 국내 한정입니다. 글로벌 사용권은 별도 견적이며,
        지역 범위(아시아·미국·EU 등)와 기간을 명시한 견적서로 발행합니다.
        라이선스 조항 상세는{" "}
        <Link
          href="/blog/ai-model-licensing-explained"
          className="underline hover:text-white"
        >
          라이선스 가이드 글
        </Link>
        을 참고하세요.
      </p>
    ),
    aText:
      "기본 라이선스는 국내 한정입니다. 글로벌 사용권은 별도 견적이며, 지역 범위(아시아·미국·EU 등)와 기간을 명시한 견적서로 발행합니다.",
  },
  {
    q: "광고에 AI 사용 사실을 명시해야 하나요?",
    a: (
      <p>
        2026년 한국 광고심의기준(방심위·공정위 가이드)은 AI 생성
        이미지·영상에 대한 명시 의무를 광고주에게 둡니다. 표기 위치는
        매체에 따라 다르지만 캡션·크리에이티브 자막·캠페인·디스크림의 첫
        줄에 노출하는 방식을 권장합니다. Virtual Agency는 견적 단계에서
        적용 가능한 표기 가이드를 함께 제공합니다.{" "}
        <Link
          href="/blog/ai-content-disclosure-2026"
          className="underline hover:text-white"
        >
          관련 가이드
        </Link>
        를 참고하세요.
      </p>
    ),
    aText:
      "2026년 한국 광고심의기준(방심위·공정위 가이드)은 AI 생성 이미지·영상에 대한 명시 의무를 광고주에게 둡니다. Virtual Agency는 견적 단계에서 적용 가능한 표기 가이드를 함께 제공합니다.",
  },
  {
    q: "트렌딩 페이지의 모델은 광고 효율이 좋은가요?",
    a: (
      <p>
        <Link href="/trending" className="underline hover:text-white">
          /trending
        </Link>
        은 30일 페이지뷰 기반 정렬이며, 광고 효율(클릭률·전환율)과는 다른
        신호입니다. 신규 캠페인이라면 트렌딩 + 1주 운영 데이터 병행, 분기
        운영이라면 inquiry rate가 평균 이상인 모델을 우선합니다. 두 신호가
        동시에 높으면 캐스팅 1순위입니다.
      </p>
    ),
    aText:
      "/trending은 30일 페이지뷰 기반 정렬이며 광고 효율(클릭률·전환율)과는 다른 신호입니다.",
  },
  {
    q: "응답은 얼마나 빠르게 받을 수 있나요?",
    a: (
      <p>
        내부 SLA: 첫 이메일 회신 중앙값 4시간, p90 12시간 이내 1차 응답입
        니다. 24시간 초과 시 자동 follow-up 메일 + admin dashboard의 stale
        카운터에 노출되어 우선 처리됩니다. 카탈로그 hero의 응답 SLA
        스트립은 최근 7일 중앙값을 실시간 노출합니다.
      </p>
    ),
    aText:
      "내부 SLA: 첫 이메일 회신 중앙값 4시간, p90 12시간 이내 1차 응답입니다. 24시간 초과 시 자동 follow-up 메일 + admin dashboard의 stale 카운터에 노출되어 우선 처리됩니다.",
  },
];

export default function FAQPage() {
  const faqLd = faqPageLd(
    FAQ.map((item) => ({ question: item.q, answer: item.aText }))
  );
  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(faqLd) }}
      />
      <header className="border-b border-zinc-900 px-8 py-5">
        <Link
          href="/"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
          자주 묻는 질문
        </p>
        <h1 className="text-4xl font-bold mb-3">FAQ</h1>
        <p className="text-zinc-400 mb-10">
          더 궁금한 내용이 있다면{" "}
          <a
            href="mailto:hello@aihubs.uk"
            className="text-zinc-200 underline hover:text-white"
          >
            hello@aihubs.uk
          </a>
          로 문의해 주세요.
        </p>

        <ul className="divide-y divide-zinc-900 border-y border-zinc-900">
          {FAQ.map((item, i) => (
            <li key={i}>
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-5">
                  <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-5 text-sm leading-relaxed text-zinc-400">
                  {item.a}
                </div>
              </details>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center">
          <Link
            href="/match"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            AI 매칭으로 모델 찾기 →
          </Link>
        </div>
      </main>
    </div>
  );
}
