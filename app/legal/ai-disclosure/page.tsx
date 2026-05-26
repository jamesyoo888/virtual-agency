import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI 합성 콘텐츠 표기 정책 — Virtual Agency",
  description:
    "Virtual Agency가 운영하는 AI 가상 모델의 합성 콘텐츠 표기 원칙. EU AI Act Article 50, FTC Endorsement Guides, UK ASA / CAP Code 및 방심위·공정위 가이드 기반.",
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
        Virtual Agency의 모든 모델은 AI로 생성된 합성 인물(synthetic talent)
        입니다. 실제 인물을 촬영한 것이 아닙니다. 본 페이지는 우리가 합성 사실을
        어떻게 명시하고, 광고주가 캠페인 집행 시 어떤 의무를 이행해야 하는지를
        설명합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. 핵심 원칙</h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1.5">
        <li>
          <strong className="text-white">합성성을 숨기지 않습니다.</strong>{" "}
          모든 모델 프로필·OG 카드·생성 이미지에 AI 생성 표기가 명시됩니다.
        </li>
        <li>
          <strong className="text-white">실제 인물 사칭을 하지 않습니다.</strong>{" "}
          캐릭터는 가공의 인물이며, 실존 인물 또는 유명인을 모사하지 않습니다.
        </li>
        <li>
          <strong className="text-white">조작 가능성을 문서화합니다.</strong>{" "}
          모든 산출물은 합성 메타데이터를 포함하므로 다운스트림 플랫폼이
          올바르게 분류할 수 있습니다.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        2. 적용되는 법규
      </h2>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.1 EU AI Act Article 50 (2026 시행)
      </h3>
      <p className="leading-relaxed">
        EU 시장을 대상으로 한 캠페인은 AI 시스템으로 생성·조작된 이미지·오디오·
        영상 콘텐츠임을 명시적으로 표시해야 합니다 (Art. 50 §2). Virtual
        Agency는 다음을 제공합니다.
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
        <li>
          <strong className="text-white">C2PA / 메타데이터 워터마크</strong> —
          출력물 EXIF 및 C2PA manifest에 «AI-generated» 마킹 삽입 (요청 시
          활성화)
        </li>
        <li>
          <strong className="text-white">시각적 워터마크</strong> — 모서리
          또는 캡션에 «AI-generated» / «합성 콘텐츠» 표기 옵션
        </li>
        <li>
          <strong className="text-white">alt text</strong> — «AI-generated
          portrait of a fictional model named {`{name}`}» 자동 생성
        </li>
      </ul>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.2 FTC Endorsement Guides (미국)
      </h3>
      <p className="leading-relaxed">
        미국 연방거래위원회는 가상 인플루언서·AI 모델을 인간 endorser와 동일한
        기준으로 규제합니다 (16 CFR Part 255, 2023 개정). 캠페인 게시물에
        다음을 포함해야 합니다.
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
        <li>«This is a fictional, AI-generated character» 등 명시</li>
        <li>광고임을 #ad / #sponsored 등으로 표시</li>
        <li>실제 사용 경험을 주장하지 않을 것 (모델은 제품을 사용한 적이 없음)</li>
      </ul>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.3 UK ASA / CAP Code (영국)
      </h3>
      <p className="leading-relaxed">
        영국 광고심의기구(ASA)는 오인 가능한 표현을 금지합니다 (CAP Code Rule
        3.1). 모델이 합성임을 일반 소비자가 명확히 인지할 수 있도록 캡션·자막·
        해시태그·화면 텍스트 중 하나 이상으로 표기해야 합니다.
      </p>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.4 방심위·공정위 가이드 (한국, 2024-06)
      </h3>
      <p className="leading-relaxed">
        방송통신심의위원회와 공정거래위원회는 AI 가상 모델 광고에 «가상
        인물입니다» 또는 «AI 모델» 등의 표기를 권고합니다. 화장품·식품·금융
        등 효능 주장이 포함되는 카테고리는 사실상 의무에 가깝습니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        3. 자동 적용 사항
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1.5">
        <li>모든 모델 상세 페이지 우상단 «AI Synthetic» 배지</li>
        <li>OG 카드에 «AI-generated synthetic talent» 문구</li>
        <li>
          모델 페이지마다 본 표기 정책({" "}
          <Link
            href="/legal/ai-disclosure"
            className="text-zinc-300 underline hover:text-white"
          >
            /legal/ai-disclosure
          </Link>{" "}
          )으로의 링크
        </li>
        <li>견적 PDF 푸터에 «합성 콘텐츠 — 캠페인 표기 필요» 문구</li>
        <li>
          JSON-LD Person 스키마의{" "}
          <code className="text-zinc-300">additionalType</code> 표기
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        4. 광고주 의무
      </h2>
      <ol className="list-decimal list-inside leading-relaxed space-y-1.5">
        <li>
          크리에이티브에 합성성을 노출 — 캡션·자막·화면 텍스트 중 최소 하나는
          «AI 모델», «가상 모델», 또는 «AI-generated» 등으로 표기.
        </li>
        <li>타깃 시장에 맞는 워터마크 옵션 활성화 (EU = C2PA 필수).</li>
        <li>1인칭 제품 경험을 암시하는 카피를 작성하지 않을 것 (예: «사용해보니…»).</li>
        <li>실제 인물 또는 유명인과 유사하게 보이도록 수정하지 않을 것 — 묵시적·명시적 모두.</li>
      </ol>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        5. 금지 사용
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>실제 인물의 디지털 트윈 생성 (얼굴·목소리·신체)</li>
        <li>합성 표기 없는 정치·선거 콘텐츠</li>
        <li>의료·금융 전문가 사칭</li>
        <li>미성년으로 읽힐 수 있는 인물의 성적·유해 콘텐츠</li>
        <li>인종·성별·종교에 대한 혐오·차별 표현</li>
      </ul>
      <p className="leading-relaxed mt-2">
        확인된 위반은 즉시 takedown 요청 대상이며, 반복 위반 시 계약을
        종료합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. 컴플라이언스 문의</h2>
      <p className="leading-relaxed">
        시장별 표기 관련 문의 또는 법무 검토:{" "}
        <a
          href="mailto:compliance@aihubs.uk"
          className="text-zinc-300 underline hover:text-white"
        >
          compliance@aihubs.uk
        </a>
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        본 정책은 EU AI Act, US FTC Endorsement Guides, UK ASA CAP Code 및
        한국 방심위·공정위 가이드를 종합한 운영 기준입니다. 캠페인별 법률
        자문을 대체하지 않으며, 광고주는 대상 시장의 최신 규제 확인 책임을
        집니다.
      </p>
    </>
  );
}
