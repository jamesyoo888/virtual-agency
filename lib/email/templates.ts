/**
 * Plain-text-first email templates. Each function returns `{ subject, html,
 * text }` ready for `sendEmail()`. HTML is intentionally minimal — table-based
 * layouts and tracking pixels are not needed for transactional notifications
 * to clients/admins, and inline CSS limited to the bare essentials renders
 * acceptably across Gmail / Outlook / Apple Mail.
 *
 * Keep the WHY here: emails ship without the brand mark intentionally because
 * the OG endpoint already handles social-card branding and the operator wants
 * to avoid Gmail's image-prompt friction for first-time recipients.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://virtual-agency-murex.vercel.app";

const STATUS_KO: Record<string, string> = {
  inquiry: "문의 접수",
  brief_received: "브리프 접수 완료",
  in_progress: "제작 중",
  review: "검토 단계",
  delivered: "납품 완료",
};

const STATUS_NOTE: Record<string, string> = {
  inquiry: "담당자가 24시간 내 연락드립니다.",
  brief_received: "브리프 검토 후 제작에 착수합니다.",
  in_progress: "제작이 진행 중입니다. 진행 상황은 대시보드에서 확인할 수 있어요.",
  review: "결과물이 준비되어 검토 대기 중입니다. 대시보드에서 확인해 주세요.",
  delivered: "최종 결과물이 납품되었습니다. 다운로드 링크가 활성화되었어요.",
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;padding:24px;background:#0a0a0a;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:28px;">
    ${body}
    <hr style="border:0;border-top:1px solid #27272a;margin:24px 0">
    <p style="color:#71717a;font-size:12px;margin:0">Virtual Agency · <a href="${BASE_URL}" style="color:#a1a1aa">${BASE_URL.replace(/^https?:\/\//, "")}</a></p>
  </div>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InquiryReceivedVars {
  clientName?: string | null;
  modelName: string;
  projectTitle: string;
  brief?: string | null;
  projectId: string;
}

export function inquiryReceived(vars: InquiryReceivedVars): RenderedEmail {
  const greet = vars.clientName ? `${vars.clientName}님,` : "안녕하세요,";
  const url = `${BASE_URL}/client/dashboard`;
  const calcUrl = `${BASE_URL}/pricing-calculator?utm_source=email&utm_campaign=inquiry_received_ko`;
  const subject = `[Virtual Agency] ${vars.modelName} 문의가 접수되었습니다`;

  const text =
    `${greet}\n\n${vars.modelName} 모델에 대한 문의를 잘 받았습니다. ` +
    `담당자가 24시간 내 회신드릴 예정입니다.\n\n` +
    `프로젝트: ${vars.projectTitle}\n` +
    (vars.brief ? `요청사항:\n${vars.brief}\n\n` : "\n") +
    `대시보드: ${url}\n` +
    `예산 점검? 견적 계산기: ${calcUrl}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">문의가 접수되었습니다</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} <strong style="color:#fafafa">${escape(vars.modelName)}</strong> 모델에 대한 문의를 잘 받았습니다. 담당자가 24시간 내 회신드릴 예정입니다.</p>
<div style="background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:14px 16px;margin:0 0 18px">
  <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">프로젝트</p>
  <p style="margin:0;color:#e4e4e7;font-weight:500">${escape(vars.projectTitle)}</p>
${
  vars.brief
    ? `<p style="margin:12px 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">요청사항</p>
<p style="margin:0;white-space:pre-wrap;color:#d4d4d8">${escape(vars.brief)}</p>`
    : ""
}
</div>
<p style="margin:0 0 14px"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">대시보드 열기</a></p>
<p style="margin:0;font-size:13px;color:#a1a1aa">담당자 회신 기다리는 동안 예산 범위가 궁금하시면 <a href="${calcUrl}" style="color:#6ee7b7">견적 계산기</a>에서 4 입력으로 즉시 확인 가능합니다.</p>`
  );

  return { subject, html, text };
}

export interface StatusChangedVars {
  clientName?: string | null;
  modelName: string | null;
  projectTitle: string;
  projectId: string;
  from: string;
  to: string;
}

export function statusChanged(vars: StatusChangedVars): RenderedEmail {
  const greet = vars.clientName ? `${vars.clientName}님,` : "안녕하세요,";
  const fromLabel = STATUS_KO[vars.from] ?? vars.from;
  const toLabel = STATUS_KO[vars.to] ?? vars.to;
  const note = STATUS_NOTE[vars.to] ?? "";
  const url = `${BASE_URL}/client/dashboard`;
  const modelPart = vars.modelName ? `${vars.modelName} · ` : "";
  const subject = `[Virtual Agency] ${modelPart}${vars.projectTitle} — ${toLabel}`;

  const text =
    `${greet}\n\n프로젝트 "${vars.projectTitle}" 의 상태가 변경되었습니다.\n\n` +
    `이전: ${fromLabel}\n현재: ${toLabel}\n\n${note}\n\n대시보드: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">상태가 변경되었습니다</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} 프로젝트 "<strong style="color:#fafafa">${escape(vars.projectTitle)}</strong>" 의 상태가 변경되었습니다.</p>
<div style="background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:14px 16px;margin:0 0 18px">
  <p style="margin:0 0 6px;color:#71717a;font-size:13px">${escape(fromLabel)} <span style="color:#52525b">→</span> <strong style="color:#fafafa">${escape(toLabel)}</strong></p>
  ${note ? `<p style="margin:8px 0 0;color:#d4d4d8;font-size:13px">${escape(note)}</p>` : ""}
</div>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">대시보드 열기</a></p>`
  );

  return { subject, html, text };
}

export interface QuoteReadyVars {
  clientName?: string | null;
  modelName: string;
  projectTitle: string;
  projectId: string;
  amount: number;
}

export interface DigestVars {
  clientName?: string | null;
  active: Array<{ id: string; title: string; status_ko: string; modelName: string | null; isRecent: boolean }>;
  recentChangesCount: number;
  deliveredCount: number;
}

export function weeklyDigest(vars: DigestVars): RenderedEmail {
  const greet = vars.clientName ? `${vars.clientName}님,` : "안녕하세요,";
  const url = `${BASE_URL}/client/dashboard`;
  const prefsUrl = `${BASE_URL}/client/preferences`;
  const subject = `[Virtual Agency] 이번 주 진행 현황 — ${vars.active.length}개 프로젝트`;

  // Plain text — short list, ordered by recency, recent items get a chevron.
  const lines = vars.active.length === 0
    ? ["현재 진행 중인 프로젝트가 없습니다."]
    : vars.active.map(
        (p) =>
          `${p.isRecent ? "› " : "  "}${p.title}${p.modelName ? ` (${p.modelName})` : ""} — ${p.status_ko}`
      );

  const text =
    `${greet}\n\n이번 주 활동 요약입니다.\n\n` +
    `활성 프로젝트 ${vars.active.length}건 · 이번 주 변경 ${vars.recentChangesCount}건 · 누적 납품 ${vars.deliveredCount}건\n\n` +
    `${lines.join("\n")}\n\n` +
    `대시보드: ${url}\n` +
    `수신 거부: ${prefsUrl}\n`;

  const items = vars.active
    .map(
      (p) => `<li style="margin:6px 0;color:#d4d4d8">
        ${p.isRecent ? '<span style="color:#34d399">●</span> ' : '<span style="color:#3f3f46">○</span> '}
        <strong style="color:#fafafa">${escape(p.title)}</strong>
        ${p.modelName ? `<span style="color:#71717a"> · ${escape(p.modelName)}</span>` : ""}
        <span style="float:right;font-size:12px;color:#a1a1aa">${escape(p.status_ko)}</span>
      </li>`
    )
    .join("");

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">이번 주 진행 요약</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)}</p>
<div style="display:flex;gap:8px;margin:0 0 18px">
  <div style="flex:1;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px"><p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">활성</p><p style="margin:4px 0 0;color:#fafafa;font-weight:600">${vars.active.length}건</p></div>
  <div style="flex:1;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px"><p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">이번 주 변경</p><p style="margin:4px 0 0;color:#fafafa;font-weight:600">${vars.recentChangesCount}건</p></div>
  <div style="flex:1;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px"><p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">누적 납품</p><p style="margin:4px 0 0;color:#fafafa;font-weight:600">${vars.deliveredCount}건</p></div>
</div>
${
  vars.active.length === 0
    ? '<p style="margin:0 0 18px;color:#a1a1aa">현재 진행 중인 프로젝트가 없습니다. 새 프로젝트를 시작해 보세요.</p>'
    : `<ul style="list-style:none;padding:0;margin:0 0 18px;border-top:1px solid #27272a">${items}</ul>`
}
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">대시보드 열기</a></p>
<p style="margin:18px 0 0;font-size:11px;color:#71717a">주간 요약을 그만 받으시려면 <a href="${prefsUrl}" style="color:#a1a1aa">알림 설정</a>에서 끌 수 있습니다.</p>`
  );

  return { subject, html, text };
}

export interface ReferralThanksVars {
  clientName?: string | null;
  refereeCompany: string | null;
}

export function referralThanks(vars: ReferralThanksVars): RenderedEmail {
  const greet = vars.clientName ? `${vars.clientName}님,` : "안녕하세요,";
  const url = `${BASE_URL}/client/dashboard`;
  const refereeLabel = vars.refereeCompany
    ? `${vars.refereeCompany} 측에서`
    : "추천하신 광고주가";
  const subject = `[Virtual Agency] 추천한 광고주가 첫 문의를 보냈습니다`;

  const text =
    `${greet}\n\n${refereeLabel} Virtual Agency 에 첫 문의를 접수했습니다. ` +
    `링크가 정확히 동작 중이라는 신호이며, 추후 운영 정책에 따라 추천 보상이 적용될 수 있습니다.\n\n` +
    `대시보드: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">추천 광고주가 첫 문의를 보냈습니다</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} <strong style="color:#fafafa">${escape(refereeLabel)}</strong> Virtual Agency 에 첫 문의를 접수했습니다.</p>
<p style="margin:0 0 18px;color:#d4d4d8">링크가 정확히 동작 중이라는 신호이며, 추후 운영 정책에 따라 추천 보상이 적용될 수 있습니다.</p>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">대시보드 열기</a></p>`
  );

  return { subject, html, text };
}

export interface InquiryFollowupVars {
  clientName?: string | null;
  modelName: string | null;
  projectTitle: string;
  projectId: string;
  daysSinceInquiry: number;
}

export function inquiryFollowup(vars: InquiryFollowupVars): RenderedEmail {
  const greet = vars.clientName ? `${vars.clientName}님,` : "안녕하세요,";
  const url = `${BASE_URL}/client/dashboard`;
  const modelPart = vars.modelName ? ` ${vars.modelName} 모델에 대한` : "";
  const subject = `[Virtual Agency] 문의 진행이 멈춰 있어 다시 안내드립니다`;

  const text =
    `${greet}\n\n${vars.daysSinceInquiry}일 전 접수된${modelPart} "${vars.projectTitle}" 문의가 ` +
    `아직 브리프 단계로 넘어가지 않았습니다. 추가 정보가 필요하시거나 우선순위 조정이 필요하면 ` +
    `대시보드에서 회신해 주세요. 답신만 주시면 담당자가 24시간 내 다시 안내드립니다.\n\n` +
    `대시보드: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">문의 진행 도움이 필요하신가요?</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} ${vars.daysSinceInquiry}일 전 접수된${modelPart ? ` <strong style="color:#fafafa">${escape(vars.modelName ?? "")}</strong> 모델에 대한` : ""} "<strong style="color:#fafafa">${escape(vars.projectTitle)}</strong>" 문의가 아직 다음 단계로 넘어가지 않았습니다.</p>
<p style="margin:0 0 18px;color:#d4d4d8">추가 정보가 필요하시거나 우선순위 조정이 필요하면 대시보드에서 회신해 주세요. 답신만 주시면 담당자가 24시간 내 다시 안내드립니다.</p>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">대시보드 열기</a></p>`
  );

  return { subject, html, text };
}

export function quoteReady(vars: QuoteReadyVars): RenderedEmail {
  const greet = vars.clientName ? `${vars.clientName}님,` : "안녕하세요,";
  const url = `${BASE_URL}/client/quote/${vars.projectId}`;
  const subject = `[Virtual Agency] ${vars.modelName} 견적이 준비되었습니다`;
  const amountKr = new Intl.NumberFormat("ko-KR").format(vars.amount);

  const text =
    `${greet}\n\n${vars.modelName} 모델 (${vars.projectTitle}) 의 견적이 준비되었습니다.\n\n` +
    `금액: ₩${amountKr} (부가세 별도)\n\n견적서: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">견적서가 준비되었습니다</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} <strong style="color:#fafafa">${escape(vars.modelName)}</strong> 모델 ("${escape(vars.projectTitle)}") 의 견적이 준비되었습니다.</p>
<p style="margin:0 0 18px;color:#fafafa;font-size:22px;font-weight:600">₩${amountKr}<span style="color:#71717a;font-size:13px;font-weight:400"> (부가세 별도)</span></p>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">견적서 보기</a></p>`
  );

  return { subject, html, text };
}
