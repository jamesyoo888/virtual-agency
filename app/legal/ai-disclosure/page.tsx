import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI 합성 콘텐츠 표기 정책 — Virtual Agency",
  description:
    "Virtual Agency 가 운영하는 AI 가상 모델의 합성 콘텐츠 표기 원칙. EU AI Act Article 50, FTC Endorsement Guides, UK ASA / CAP Code 및 한국 방심위 가이드 기반.",
};

export default function AiDisclosurePage() {
  return (
    <>
      <p className="text-xs text-zinc-500 uppercase tracking-widest">
        최종 개정 2026-05-26 · Version 1.0
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-3 text-white">
        AI 합성 콘텐츠 표기 정책
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Virtual Agency 의 모든 모델은 AI 로 생성된 합성 인물 (synthetic talent) 입니다.
        실제로 존재하는 사람을 촬영한 것이 아닙니다. 본 페이지는 우리가 이 사실을
        어떻게 명시하고, 광고주가 캠페인 집행 시 어떤 의무를 이행해야 하는지를 설명합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. 핵심 원칙</h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1.5">
        <li>
          <strong className="text-white">합성임을 숨기지 않는다.</strong> 모든 모델 프로필
          페이지·OG 카드·생성 이미지에는 AI 생성 표기가 명시됩니다.
        </li>
        <li>
          <strong className="text-white">실제 인물과 혼동을 일으키지 않는다.</strong>
          캐릭터는 가공의 인물이며, 실존 인물 또는 유명인을 모사하지 않습니다.
        </li>
        <li>
          <strong className="text-white">조작 가능성을 알린다.</strong> 광고주에게 제공하는
          모든 산출물은 생성 AI 로 만들어졌음을 캠페인 크리에이티브 단계에서 함께 안내합니다.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        2. 적용되는 글로벌 규제
      </h2>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.1 EU AI Act Article 50 (2026 시행)
      </h3>
      <p className="leading-relaxed">
        EU 시장을 대상으로 한 캠페인은 AI 시스템으로 생성·조작된 이미지·오디오·영상에 대해
        해당 콘텐츠가 인공적으로 생성되었음을 명시적으로 표시해야 합니다 (Art. 50 §2).
        Virtual Agency 는 다음을 제공합니다.
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
        <li>
          <strong className="text-white">C2PA / 메타데이터 워터마크</strong> {`— `}
          산출물 EXIF 및 C2PA manifest 에 {`«AI-generated»`} 마킹을 삽입 (요청 시 활성화)
        </li>
        <li>
          <strong className="text-white">시각적 워터마크</strong> {`— `}
          모서리 또는 캡션에 {`«AI-generated»`} / {`«합성 콘텐츠»`} 표기 옵션
        </li>
        <li>
          <strong className="text-white">alt text</strong> {`— `}
          {`«AI-generated portrait of a fictional model named {name}»`} 자동 생성
        </li>
      </ul>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.2 FTC Endorsement Guides (미국)
      </h3>
      <p className="leading-relaxed">
        미국 연방거래위원회는 가상 인플루언서·AI 모델을 인간 endorser 와 동일한 기준으로
        규제합니다 (16 CFR Part 255, 2023 개정). 캠페인 게시물에 다음을 포함해야 합니다.
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
        <li>{`«This is a fictional, AI-generated character»`} 등 명시</li>
        <li>광고임을 #ad / #sponsored 등으로 표시</li>
        <li>실제 사용 경험을 주장하지 않을 것 (모델은 제품을 사용한 적 없음)</li>
      </ul>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.3 UK ASA / CAP Code (영국)
      </h3>
      <p className="leading-relaxed">
        영국 광고기준위원회는 misleading representation 을 금지합니다 (CAP Code Rule 3.1).
        AI 생성 모델임을 자막·캡션·hashtag 등으로 평균 소비자가 인지 가능한 방식으로
        표시해야 합니다.
      </p>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.4 한국 방심위 가이드 (2024.06)
      </h3>
      <p className="leading-relaxed">
        방송통신심의위원회·공정거래위원회는 AI 가상 모델 광고에 {`«가상 인물입니다»`}
        또는 {`«AI 모델»`} 표기를 권고합니다. 화장품·식품·금융 등 효능 주장이 따르는
        업종은 표기가 사실상 필수입니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        3. 우리가 자동으로 적용하는 표기
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1.5">
        <li>모델 detail 페이지 우측 상단 {`«AI 합성 인물»`} 배지</li>
        <li>OG 카드 하단 {`«AI-generated synthetic talent»`} 한 줄</li>
        <li>
          모든 모델 페이지에 본 정책 ({" "}
          <Link
            href="/legal/ai-disclosure"
            className="text-zinc-300 underline hover:text-white"
          >
            /legal/ai-disclosure
          </Link>{" "}
          ) 링크
        </li>
        <li>견적 PDF 푸터에 {`«Synthetic talent — campaign disclosure required»`} 한 줄</li>
        <li>JSON-LD 의 <code className="text-zinc-300">additionalType</code> 에 합성 인물 마킹</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        4. 광고주가 캠페인 집행 시 해야 할 일
      </h2>
      <ol className="list-decimal list-inside leading-relaxed space-y-1.5">
        <li>
          캠페인 크리에이티브 (이미지·영상·SNS post) 에 합성임을 명시 — 캡션·자막·OSD
          중 한 곳 이상에 {`«AI 모델»`}, {`«Virtual model»`}, {`«AI-generated»`} 표기
        </li>
        <li>
          타깃 시장의 표기 의무에 맞춰 워터마크 옵션 활성화 (EU 시장 = C2PA 필수)
        </li>
        <li>
          모델이 사용 경험을 주장하는 형태의 카피 사용 금지 (예: {`«제가 직접 써본…»`})
        </li>
        <li>
          실존 인물·유명인을 모사·합성한 것으로 보일 수 있는 변형 금지
        </li>
      </ol>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        5. 금지하는 사용
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>실존 인물의 얼굴·목소리·신체 특징을 모방한 디지털 트윈 생성</li>
        <li>합성임을 명시하지 않은 정치·선거 콘텐츠</li>
        <li>의료·금융 자문 등 전문 자격을 가장한 콘텐츠</li>
        <li>18세 미만으로 인식될 수 있는 인물의 성적 또는 위해 콘텐츠</li>
        <li>특정 인종·성별·종교를 비하·혐오하는 묘사</li>
      </ul>
      <p className="leading-relaxed mt-2">
        본 항목 위반이 확인되면 우리는 산출물 사용을 즉시 중단 요청하고, 반복 시
        계약을 해지합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        6. 컴플라이언스 문의
      </h2>
      <p className="leading-relaxed">
        본 정책에 대한 의견·법률 문의·시장별 표기 요건 확인:{" "}
        <a
          href="mailto:compliance@virtualagency.example.com"
          className="text-zinc-300 underline hover:text-white"
        >
          compliance@virtualagency.example.com
        </a>
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        ※ 본 정책은 EU AI Act, US FTC Endorsement Guides, UK ASA CAP Code, 한국
        방심위 가이드를 종합한 운영 기준이며, 개별 캠페인의 법률 자문을 대체하지
        않습니다. 광고주는 타깃 시장의 최신 규제를 별도 확인해야 합니다.
      </p>
    </>
  );
}
