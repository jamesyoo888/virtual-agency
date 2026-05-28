import type { Character } from "./registry";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Per-character FAQ — surfaced on /character/[slug] and /en/character/[slug].
 *
 * Buyer questions repeat across surfaces (RFP, sales call, email). Putting the
 * answers next to the character avoids the round-trip and feeds the FAQPage
 * JSON-LD so Google can render an accordion in the search result.
 */

export function characterFaqKo(character: Character): FaqEntry[] {
  const verticals = character.targetVerticals.slice(0, 3).join("·");
  return [
    {
      question: `${character.name}을 솔로로만 캐스팅할 수 있나요?`,
      answer: `네. 솔로 캠페인은 일별 라이선스로 견적합니다. 페어 브랜드 키트 티어를 따로 구매할 필요는 없습니다. 다만 페어 키트가 분기 단위로는 단가가 더 유리합니다.`,
    },
    {
      question: `${character.name}을 다른 시장에서도 사용할 수 있나요?`,
      answer: `기본 라이선스는 1개 시장(한국 또는 글로벌 단일 지역)을 커버합니다. 다지역(예: 한국 + 미국 + EU)은 라이선스 익스텐션으로 추가 견적합니다. 합성 표기 메타데이터는 모든 시장에서 함께 납품됩니다.`,
    },
    {
      question: `카테고리 독점 라이선스는 어떻게 동작하나요?`,
      answer: `해당 산업의 경쟁사가 같은 분기에 ${character.name}을 사용하지 못하도록 잠그는 옵션입니다. ${verticals} 카테고리에서 가능하며, "시즌 앵커" 티어 이상에서 포함되거나 "페어 에디토리얼" 티어에 추가 옵션으로 구매할 수 있습니다.`,
    },
    {
      question: `생성된 이미지의 저작권은 누가 가지나요?`,
      answer: `라이선스 기간 동안 캠페인 사용 권리는 광고주가 가집니다. 캐릭터 자체의 IP는 Virtual Agency가 유지하며, 라이선스 종료 후에는 재사용이 제한됩니다. 캐릭터 IP 전면 이전이 필요한 경우 "커스텀 멀티 페이스" 티어에서 옵션으로 협의 가능합니다.`,
    },
    {
      question: `초안 컨셉을 먼저 볼 수 있나요?`,
      answer: `RFP를 보내주시면 24시간 이내에 1차 컨셉 시트(무드보드 + 1-2컷 샘플)를 보내드립니다. 캠페인 톤이 ${character.name}의 페르소나와 잘 맞는지 먼저 확인한 후 정식 계약을 진행합니다.`,
    },
    {
      question: `${character.name}은 AI인 것을 표기해야 하나요?`,
      answer: `네, 시장별 규제에 따라 표기가 필요합니다. EU AI Act Article 50, US FTC Endorsement Guides, UK ASA/CAP Code, 한국 방심위·공정위 가이드에 맞는 합성 콘텐츠 표기 메타데이터를 모든 산출물과 함께 납품합니다.`,
    },
    {
      question: `인보이스 결제 전에 무엇을 검수해야 하나요?`,
      answer: `사인오프 직전 90 분을 잡고 8 가지를 확인하세요 — 얼굴 일관성, 손·제품 접점, 의상 컨티뉴이티, 디스클로저 메타데이터, 포맷 커버리지, 서면 라이선스 스코프, 학습 데이터 attestation, 리비전 속도. 결제 전 표준 게이트로 공개한 체크리스트가 /blog/synthetic-talent-qa-checklist-ko 에 단계별로 있습니다.`,
    },
    {
      question: `${character.name}을 일별 라이선스로 시작할까요, paired 키트로 시작할까요?`,
      answer: `결정 기준은 hero 컷 어셋 수입니다. 포맷 커버리지 포함 ~14 컷 미만이면 일별 라이선스가 더 저렴할 수 있고, 그 이상이면 paired 키트 (약 ₩1,100만) 가 거의 항상 이깁니다. 작은 캠페인 (8 컷 미만, 단일 포맷) 또는 우리 품질을 처음 테스트하는 trial run 이면 라이선스 권장. 다중 포맷 + 분기 단위 캠페인이면 paired 가 견적 수학상 합리적입니다. /pricing-calculator 에서 어셋 수·주·시장 입력하면 ${character.name} 캠페인에 맞는 path 가 즉시 surface 됩니다.`,
    },
  ];
}

export function characterFaqEn(character: Character): FaqEntry[] {
  const verticals = character.targetVerticals.slice(0, 3).join(", ");
  return [
    {
      question: `Can I cast ${character.name} solo, without a paired brand kit?`,
      answer: `Yes. Solo campaigns are quoted on a per-day license — you don't need to buy a paired tier. That said, the brand kits land on better per-asset economics if you're running a full quarter.`,
    },
    {
      question: `Which markets does the base license cover?`,
      answer: `The base license covers a single market (Korea, or one global region of your choice). Multi-market use (e.g. Korea + US + EU) is an extension priced separately. Synthetic-content disclosure metadata ships with the assets for every market.`,
    },
    {
      question: `How does category exclusivity work?`,
      answer: `Category exclusivity locks competitors in your industry out of ${character.name} for the licensed quarter. Available across ${verticals}. Included in the Season Anchor tier; add-on for Paired Editorial.`,
    },
    {
      question: `Who owns the generated images?`,
      answer: `You get campaign usage rights for the licensed term. The character IP itself stays with Virtual Agency, and reuse outside the license term is restricted. Full IP transfer is negotiable under the Custom Multi-Face tier.`,
    },
    {
      question: `Can I preview a draft concept before signing?`,
      answer: `Submit an RFP and we'll send a first-pass concept sheet (moodboard + 1-2 sample stills) within 24 hours. You can confirm ${character.name}'s persona fits your campaign tone before any contract.`,
    },
    {
      question: `Does ${character.name} need to be disclosed as AI?`,
      answer: `Yes — per-market rules vary, but synthetic-content disclosure metadata aligned to the EU AI Act Article 50, US FTC Endorsement Guides, UK ASA/CAP Code, and Korea KCSC guidance ships with every deliverable.`,
    },
    {
      question: `What should I verify before paying the invoice?`,
      answer: `Block 90 minutes the day before sign-off and run 8 checks — face consistency across the set, hands/product contact points, wardrobe continuity, disclosure metadata in the file, format coverage per the brief, license scope in writing, training-data attestation, and revision velocity SLA. We publish the full step-by-step checklist at /en/blog/synthetic-talent-qa-checklist-before-paying — same list we run internally on every delivery.`,
    },
    {
      question: `Should I start with a per-day license for ${character.name} or jump to a paired brand kit?`,
      answer: `The decision pivots on hero asset count. Under ~14 hero frames (with format coverage), per-day license can be cheaper; past that, the paired kit ($8.5K) almost always wins. License makes sense for tiny campaigns (under 8 frames, single format) or a trial run testing our quality before committing. For multi-format quarterly campaigns, the paired math is decisive. Run your scope through /en/pricing-calculator — enter assets, weeks, markets, and the right path for a ${character.name} campaign surfaces immediately.`,
    },
  ];
}
