import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, ListChecks } from "lucide-react";

export const metadata: Metadata = {
  title: "브리프 템플릿 — Virtual Agency",
  description:
    "AI 버추얼 모델 캠페인 브리프 작성 가이드. 무료 템플릿을 다운로드해 첫 견적을 5분만에 받아보세요.",
  alternates: { canonical: "/brief-template" },
  openGraph: {
    title: "브리프 템플릿 — Virtual Agency",
    description: "광고 캠페인 브리프 무료 다운로드 + 작성 가이드.",
    type: "article",
  },
};

const BRIEF_MD = `# 캠페인 브리프 — [브랜드/제품]

> Virtual Agency 캠페인 브리프 템플릿 v1
> 작성일: ____ / 작성자: ____

## 1. 캠페인 요약 (1-2 줄)
어떤 제품/서비스를, 어떤 톤으로, 어디에 노출하나요?

예) [브랜드]의 [신제품 라인]을 차분하고 도시적인 톤으로, 인스타그램 피드 + 옥외광고 3종에 사용.

## 2. 일정
- 촬영(생성) 시작 희망일: ____
- 1차 시안 회신 마감: ____
- 최종 납품 마감: ____
- 광고 게재 시작: ____

## 3. 타깃·페르소나
- 1차 타깃: (예) 25-34 여성, 도심 거주, 뷰티 카테고리 관여도 中-高
- 2차 타깃: (선택)
- 핵심 가치 / 메시지:

## 4. 모델 페르소나 — 원하는 분위기
- 산업/카테고리 톤: (뷰티, 식품, 패션, 럭셔리, 라이프스타일 …)
- 무드: (Calm / Warm / Neutral / Edgy …)
- 장르: (광고 / 영화 / 드라마 / 누아르 / 로맨스 / SF / 시대극 …)
- 참고 모델: (Virtual Agency 카탈로그 모델 ID 또는 외부 레퍼런스)

## 5. 산출물 — 정확한 형식
| 매체 | 사이즈/포맷 | 본수 | 용도 |
|---|---|---|---|
| 인스타 피드 1:1 | 1080×1080 jpg | 6 | 인플루언서 시딩 |
| 옥외 KV | 4000×6000 png | 3 | 강남역 디지털 사이니지 |
| 영상 | 1080p mp4 5초 | 2 | 리타게팅 광고 |

## 6. 라이선스
- 사용 매체: (Owned / Paid / Earned 어디까지?)
- 사용 기간: (3개월 / 6개월 / 1년)
- 독점 여부: (해당 분기 동안 경쟁사 미노출 요구 시 명시)
- 지역: (KR / 전 세계)

## 7. 예산 (선택 — 매칭 정확도를 높입니다)
- 모델 라이선스 예산: ₩____
- 제작비 예산 (영상 포함 시): ₩____
- 총 예산: ₩____

## 8. 레퍼런스
- 좋아하는 톤 / 이미지 URL (3개)
- 절대 안 되는 것 (피해야 할 무드 · 컬러 · 표현)

## 9. 그 외
- 광고주 정보:
- 제약 (촬영 불가 컬러, 종교 메시지, 표기 의무 등):
- 결제 조건 (계약금 % / 잔금 시점):
- 비고:

---
[Virtual Agency](https://virtual-agency-murex.vercel.app) · 채워 보내주시면 24시간 안에 1차 매칭 + 견적 회신드립니다.
`;

const CHECKLIST = [
  { title: "1줄 캠페인 요약", note: "브랜드 · 제품 · 노출 채널" },
  { title: "산출물 형식", note: "매체별 사이즈 · 본수까지 정확하게" },
  { title: "사용 기간 & 지역", note: "라이선스 견적의 핵심 변수" },
  {
    title: "참고 모델 또는 무드",
    note: "Virtual Agency 카탈로그 모델 ID 가장 빠릅니다",
  },
  { title: "예산 범위", note: "정확한 금액 아니어도 OK — 매칭 정확도가 올라갑니다" },
  { title: "촬영(생성) → 납품 일정", note: "최소 7 영업일 권장" },
];

export default function BriefTemplatePage() {
  // Inline data URL — no need to serve a separate static file or set up an
  // API route. The Markdown is small (~1.5KB) so embedding it is fine and
  // keeps the page self-contained.
  const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(
    BRIEF_MD
  )}`;
  return (
    <div className="px-6 py-16 max-w-3xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-zinc-500">
        Resources
      </p>
      <h1 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
        브리프 템플릿
      </h1>
      <p className="mt-4 text-zinc-400 leading-relaxed">
        AI 버추얼 모델 캠페인을 처음 의뢰하는 경우 가장 자주 빠지는 항목을
        모아 9 섹션으로 정리했습니다. 채워서{" "}
        <Link href="/rfp" className="underline underline-offset-4">
          AI 매칭
        </Link>{" "}
        에 붙여 넣거나 <a className="underline underline-offset-4" href="mailto:hello@aihubs.uk">hello@aihubs.uk</a> 로 전달해 주세요. 24시간 안에 1차 추천 + 견적 회신드립니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={dataUrl}
          download="virtual-agency-brief-template.md"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-zinc-200"
        >
          <Download className="w-4 h-4" /> Markdown 다운로드
        </a>
        <Link
          href="/rfp"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500"
        >
          <FileText className="w-4 h-4" /> 1줄로 AI 매칭 받기
        </Link>
      </div>

      <section className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            최소 체크리스트
          </h2>
        </div>
        <ul className="space-y-3">
          {CHECKLIST.map((c) => (
            <li
              key={c.title}
              className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/30"
            >
              <p className="text-sm font-medium text-zinc-100">{c.title}</p>
              <p className="text-xs text-zinc-500 mt-1">{c.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-xl border border-zinc-800 p-6 bg-zinc-900/40">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-3">
          미리보기 (Markdown)
        </h2>
        <pre className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
          {BRIEF_MD}
        </pre>
      </section>
    </div>
  );
}
