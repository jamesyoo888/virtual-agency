/**
 * RFC 4180 CSV encoder. Stays in this file rather than pulling in a library —
 * the spec is small, and the only field we routinely produce that triggers
 * escaping is the `brief` column (multi-line text).
 *
 * Always quotes every value: cheaper than scanning each field for the
 * trigger set (comma, quote, CR, LF), and excel/numbers handle quoted-all
 * just fine. Forces a UTF-8 BOM so excel doesn't mis-detect cp949 on
 * Korean text.
 */

const BOM = "﻿";

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: readonly (keyof T)[]
): string {
  const header = columns.map(escapeField).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeField(row[c])).join(","))
    .join("\r\n");
  return `${BOM}${header}\r\n${body}\r\n`;
}

/** Build a Content-Disposition value with the supplied download filename. */
export function csvFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.csv`;
}
