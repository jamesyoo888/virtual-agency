import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ — Virtual Agency",
  description: "라이선스·가격·제작 기간·사용 범위·환불에 대한 자주 묻는 질문",
};

interface QA {
  q: string;
  a: React.ReactNode;
}

const FAQ: QA[] = [
  {
    q: "버추얼 모델의 가격은 어떻게 책정되나요?",
    a: (
      <p>
        각 모델 카드에 일일 단가(₩/일)가 표시됩니다. 5일 이상 5%, 10일 이상 10%,
        30일 이상 15% 자동 할인. 모델 상세 페이지의 견적 계산기에서 즉시 견적을
        확인할 수 있으며, 최종 견적은 문의 후 확정됩니다.
      </p>
    ),
  },
  {
    q: "독점 라이선스와 비독점은 무엇이 다른가요?",
    a: (
      <p>
        독점은 계약 기간 동안 동일 산업 내 경쟁사가 같은 모델을 사용할 수
        없습니다. 단가는 비독점 대비 약 3–5배 높지만 브랜드 자산화에 유리합니다.
        비독점은 다른 클라이언트와 동시 운영이 가능하며 단가가 낮습니다.
      </p>
    ),
  },
  {
    q: "제작 기간은 얼마나 걸리나요?",
    a: (
      <p>
        이미지·룩북: 평균 2~3 영업일. 영상 (5–10초): 평균 3~5 영업일. 3D
        에셋·립싱크: 5~7 영업일. 모든 단계는 문의 → 브리프 → 제작 → 검토 → 납품의
        5단계로 진행되며, 클라이언트 대시보드에서 실시간 진행률을 확인할 수
        있습니다.
      </p>
    ),
  },
  {
    q: "AI 매칭 추천은 어떻게 작동하나요?",
    a: (
      <p>
        <Link href="/match" className="underline hover:text-white">
          AI 매칭 페이지
        </Link>
        에서 광고 컨셉을 자유롭게 입력하거나 산업·장르·분위기·예산을 선택하면,
        룰 기반 점수(산업 35pt · 장르 25pt · 분위기 20pt · 예산 보너스 + 인지도
        가중치)로 모델이 정렬됩니다. 각 추천에는 점수 근거가 함께 표시되어
        의사결정에 활용할 수 있습니다.
      </p>
    ),
  },
  {
    q: "어디까지 사용 가능한가요? 사용 범위가 궁금합니다.",
    a: (
      <p>
        라이선스에 명시된 매체(SNS·옥외광고·인쇄·웹배너 등)와 지역, 기간 내에서
        사용 가능합니다. 딥페이크, 성적 콘텐츠, 정치 캠페인, 실존 인물 사칭 등의
        용도는 모두{" "}
        <Link href="/legal/terms" className="underline hover:text-white">
          이용약관
        </Link>{" "}
        제4조에 따라 금지됩니다.
      </p>
    ),
  },
  {
    q: "환불 정책은 어떻게 되나요?",
    a: (
      <p>
        제작 착수 전 해지 시 전액 환불. 제작 단계별로 진행된 비율만큼 차감 후
        환불됩니다. 납품 완료 후에는 환불이 불가능합니다.
      </p>
    ),
  },
  {
    q: "수정·재제작 횟수에 제한이 있나요?",
    a: (
      <p>
        기본 패키지: 검토 단계에서 2회 무료 수정. 추가 수정은 회당 50,000원
        ~150,000원 (모델·복잡도에 따라). 컨셉 변경 등 본질적 재작업은 별도 견적.
      </p>
    ),
  },
  {
    q: "3D 모델이나 영상 립싱크도 가능한가요?",
    a: (
      <p>
        가능합니다. 모델 생성 단계에서 자동으로 3D 메시 (Meshy AI, GLB/FBX) 가
        생성되며, 영상 제작 시 립싱크 (Sync AI) 옵션을 추가할 수 있습니다. 둘 다
        별도 견적 단가가 적용됩니다.
      </p>
    ),
  },
  {
    q: "초상권·저작권 문제는 없나요?",
    a: (
      <p>
        모든 모델은 AI 로 생성된 가상 인물로, 실존 인물의 외모를 모방하지 않도록
        설계됩니다. 모델 자산의 저작권은 회사가 보유하며, 라이선스 범위 내에서
        클라이언트가 사용할 수 있습니다.
      </p>
    ),
  },
  {
    q: "비용 cap 같은 안전장치가 있나요?",
    a: (
      <p>
        관리자 시스템에 4단계 (호출·일·주·월) 비용 cap 이 적용되어 있어 AI 추론
        비용 폭증을 사전 차단합니다. 클라이언트 측에는 영향이 없습니다.
      </p>
    ),
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5">
        <Link href="/" className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300">
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
            href="mailto:hello@virtualagency.example.com"
            className="text-zinc-200 underline hover:text-white"
          >
            hello@virtualagency.example.com
          </a>{" "}
          으로 문의하세요.
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
