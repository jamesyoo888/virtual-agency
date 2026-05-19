/**
 * Compose a multi-line brief text from RFP page inputs. The output is what the
 * client sees pre-filled inside the inquiry form on the model detail page when
 * they hit "이 추천으로 문의 시작" — so it must read as a self-contained
 * summary, not as a key=value dump.
 */

import { INDUSTRY_LABELS, MOOD_LABELS } from "@/lib/tags";

const CHANNEL_LABELS: Record<string, string> = {
  tvc: "TVC",
  digital: "디지털/SNS",
  ooh: "옥외/OOH",
  print: "인쇄/지면",
  lookbook: "룩북",
  kv: "키 비주얼",
};

const BUDGET_LABELS: Record<string, string> = {
  under_500: "500만원 미만",
  "500_1000": "500 ~ 1,000만원",
  "1000_3000": "1,000 ~ 3,000만원",
  over_3000: "3,000만원 이상",
};

export interface RfpComposeInput {
  campaign?: string;
  advertiser?: string;
  launch?: string;
  durationDays?: string;
  channels?: string[];
  message?: string;
  heroCopy?: string;
  industries?: string[];
  moods?: string[];
  targetAge?: string;
  budgetBand?: string;
  budgetPerDay?: number | null;
  needsExclusive?: boolean;
}

function joinLabels(values: string[] | undefined, lookup: Record<string, string>): string {
  if (!values || values.length === 0) return "";
  return values.map((v) => lookup[v] ?? v).join(", ");
}

const KRW = new Intl.NumberFormat("ko-KR");

export function composeRfpBrief(input: RfpComposeInput): string {
  const lines: string[] = ["[RFP 기반 추천 문의]"];

  if (input.campaign) lines.push(`캠페인: ${input.campaign}`);
  if (input.advertiser) lines.push(`광고주/대행사: ${input.advertiser}`);

  const periodParts: string[] = [];
  if (input.launch) periodParts.push(`런칭 ${input.launch}`);
  if (input.durationDays) periodParts.push(`${input.durationDays}일 운영`);
  if (periodParts.length > 0) lines.push(`일정: ${periodParts.join(", ")}`);

  const channels = joinLabels(input.channels, CHANNEL_LABELS);
  if (channels) lines.push(`매체: ${channels}`);

  if (input.targetAge) lines.push(`타깃: ${input.targetAge}`);

  const industries = joinLabels(input.industries, INDUSTRY_LABELS);
  if (industries) lines.push(`업종 키워드: ${industries}`);
  const moods = joinLabels(input.moods, MOOD_LABELS);
  if (moods) lines.push(`분위기 키워드: ${moods}`);

  const budgetBits: string[] = [];
  if (input.budgetBand && BUDGET_LABELS[input.budgetBand]) {
    budgetBits.push(`총 예산 ${BUDGET_LABELS[input.budgetBand]}`);
  }
  if (input.budgetPerDay && input.budgetPerDay > 0) {
    budgetBits.push(`일 단가 상한 ₩${KRW.format(input.budgetPerDay)}`);
  }
  if (input.needsExclusive) budgetBits.push("독점 라이선스 요청");
  if (budgetBits.length > 0) lines.push(`라이선스/예산: ${budgetBits.join(", ")}`);

  if (input.message) lines.push(`\n핵심 메시지\n${input.message}`);
  if (input.heroCopy) lines.push(`\n히어로 카피\n${input.heroCopy}`);

  return lines.join("\n");
}

/** Best matching `budget_range` Select option for a given budget band string. */
export function budgetBandToRange(band: string | undefined): string {
  if (!band) return "";
  return band in BUDGET_LABELS ? band : "";
}
