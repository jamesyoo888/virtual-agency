import { PDFDocument, rgb, PDFPage, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadKoreanFont } from "./font";

export interface QuotePdfInput {
  projectId: string;
  projectTitle: string;
  brief?: string | null;
  modelName?: string | null;
  status: string;
  invoiceAmount: number;
  createdAt: Date;
  validUntil: Date;
  exclusiveAvailable: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: "문의 접수",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

const KRW = new Intl.NumberFormat("ko-KR");

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
  y: number;
}

function moveDown(ctx: DrawCtx, dy: number) {
  ctx.y -= dy;
}

function drawText(
  ctx: DrawCtx,
  text: string,
  x: number,
  size: number,
  color: ReturnType<typeof rgb> = rgb(0.1, 0.1, 0.1)
) {
  ctx.page.drawText(text, {
    x,
    y: ctx.y,
    size,
    font: ctx.font,
    color,
  });
}

function drawRightText(
  ctx: DrawCtx,
  text: string,
  rightX: number,
  size: number
) {
  const w = ctx.font.widthOfTextAtSize(text, size);
  drawText(ctx, text, rightX - w, size);
}

function drawLine(ctx: DrawCtx, x1: number, x2: number, color = rgb(0.85, 0.85, 0.85)) {
  ctx.page.drawLine({
    start: { x: x1, y: ctx.y },
    end: { x: x2, y: ctx.y },
    thickness: 0.5,
    color,
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  // Simple greedy wrap by characters — Korean text has no spaces, so word-
  // based wrapping (split on /\s+/) would render whole sentences off-page.
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(cur);
      cur = "";
      continue;
    }
    const candidate = cur + ch;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await loadKoreanFont();
  const font = await pdf.embedFont(fontBytes, { subset: true });

  // A4 in points: 595.28 × 841.89
  const page = pdf.addPage([595.28, 841.89]);
  const ctx: DrawCtx = { page, font, y: 800 };

  const left = 50;
  const right = 545;

  // Eyebrow + title
  drawText(ctx, "VIRTUAL AGENCY", left, 9, rgb(0.45, 0.45, 0.45));
  moveDown(ctx, 22);
  drawText(ctx, "견적서", left, 26);
  drawText(ctx, "Quotation", left + 75, 12, rgb(0.5, 0.5, 0.5));

  // Quote number (right-aligned)
  const quoteNo = `VA-${input.projectId.slice(0, 8).toUpperCase()}`;
  const noLabelY = ctx.y;
  page.drawText("견적번호", {
    x: right - font.widthOfTextAtSize("견적번호", 9),
    y: noLabelY + 14,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
  page.drawText(quoteNo, {
    x: right - font.widthOfTextAtSize(quoteNo, 11),
    y: noLabelY - 2,
    size: 11,
    font,
  });

  moveDown(ctx, 50);

  // Two-column meta block (발행 / 프로젝트)
  const colTop = ctx.y;
  drawText(ctx, "발행", left, 8, rgb(0.5, 0.5, 0.5));
  moveDown(ctx, 12);
  drawText(ctx, "Virtual Agency", left, 11);
  moveDown(ctx, 12);
  drawText(ctx, "AI 버추얼 모델 에이전시", left, 9, rgb(0.4, 0.4, 0.4));
  moveDown(ctx, 14);
  drawText(
    ctx,
    `발행일: ${input.createdAt.toLocaleDateString("ko-KR")}`,
    left,
    9,
    rgb(0.4, 0.4, 0.4)
  );
  moveDown(ctx, 12);
  drawText(
    ctx,
    `유효기간: ${input.validUntil.toLocaleDateString("ko-KR")}`,
    left,
    9,
    rgb(0.4, 0.4, 0.4)
  );

  // Right column reuses colTop
  const rightCol = left + 270;
  page.drawText("프로젝트", {
    x: rightCol,
    y: colTop,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(input.projectTitle, {
    x: rightCol,
    y: colTop - 12,
    size: 11,
    font,
  });
  const statusLabel = STATUS_LABELS[input.status] ?? input.status;
  page.drawText(`상태: ${statusLabel}`, {
    x: rightCol,
    y: colTop - 26,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  if (input.modelName) {
    page.drawText(`모델: ${input.modelName}`, {
      x: rightCol,
      y: colTop - 40,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  moveDown(ctx, 50);

  // Brief block
  if (input.brief) {
    drawText(ctx, "브리프", left, 8, rgb(0.5, 0.5, 0.5));
    moveDown(ctx, 14);
    const briefLines = wrap(input.brief, font, 10, right - left);
    for (const line of briefLines.slice(0, 8)) {
      drawText(ctx, line, left, 10, rgb(0.25, 0.25, 0.25));
      moveDown(ctx, 14);
    }
    moveDown(ctx, 14);
  }

  // Line items table
  drawLine(ctx, left, right, rgb(0.1, 0.1, 0.1));
  moveDown(ctx, 14);
  drawText(ctx, "항목", left, 9, rgb(0.45, 0.45, 0.45));
  drawRightText(ctx, "금액 (KRW)", right, 9);
  moveDown(ctx, 4);
  drawLine(ctx, left, right);
  moveDown(ctx, 18);

  const lineName = input.modelName ?? "모델 사용료";
  drawText(ctx, lineName, left, 11);
  drawRightText(ctx, `₩${KRW.format(input.invoiceAmount)}`, right, 11);
  moveDown(ctx, 14);
  drawText(
    ctx,
    input.exclusiveAvailable ? "독점 사용 가능" : "비독점 기본 단가",
    left,
    8,
    rgb(0.5, 0.5, 0.5)
  );
  moveDown(ctx, 10);
  drawLine(ctx, left, right);

  const vat = Math.round(input.invoiceAmount * 0.1);
  const total = input.invoiceAmount + vat;
  moveDown(ctx, 18);
  drawText(ctx, "소계", left, 10, rgb(0.4, 0.4, 0.4));
  drawRightText(ctx, `₩${KRW.format(input.invoiceAmount)}`, right, 10);
  moveDown(ctx, 4);
  drawLine(ctx, left, right);
  moveDown(ctx, 16);
  drawText(ctx, "부가세 (10%)", left, 10, rgb(0.4, 0.4, 0.4));
  drawRightText(ctx, `₩${KRW.format(vat)}`, right, 10);
  moveDown(ctx, 4);
  drawLine(ctx, left, right, rgb(0.1, 0.1, 0.1));
  moveDown(ctx, 22);
  drawText(ctx, "합계", left, 13);
  drawRightText(ctx, `₩${KRW.format(total)}`, right, 13);
  moveDown(ctx, 8);
  drawLine(ctx, left, right, rgb(0.1, 0.1, 0.1));

  moveDown(ctx, 40);

  // Footer notes
  const notes = [
    "상기 견적은 발행일로부터 30일간 유효합니다.",
    "결제 조건 및 납기는 별도 협의 후 확정됩니다.",
    "본 견적은 표준 라이선스 기준이며, 사용 범위·기간에 따라 변경될 수 있습니다.",
  ];
  for (const n of notes) {
    drawText(ctx, `· ${n}`, left, 8, rgb(0.5, 0.5, 0.5));
    moveDown(ctx, 12);
  }

  moveDown(ctx, 20);
  drawLine(ctx, left, right);
  moveDown(ctx, 14);
  const tagline = "Virtual Agency · AI Virtual Models";
  const tw = font.widthOfTextAtSize(tagline, 8);
  drawText(ctx, tagline, (left + right) / 2 - tw / 2, 8, rgb(0.5, 0.5, 0.5));

  return pdf.save();
}
