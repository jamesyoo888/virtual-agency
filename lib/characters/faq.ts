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
  ];
}
