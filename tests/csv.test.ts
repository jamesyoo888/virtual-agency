import { describe, it, expect } from "vitest";
import { toCSV, csvFilename } from "@/lib/csv";

describe("csv / toCSV", () => {
  it("emits a UTF-8 BOM so Excel reads Korean correctly", () => {
    const csv = toCSV([{ a: "한글" }], ["a"]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("quotes every field — even simple ones — for RFC4180 safety", () => {
    const csv = toCSV([{ a: "ok", b: 5 }], ["a", "b"]);
    expect(csv).toContain('"a","b"');
    expect(csv).toContain('"ok","5"');
  });

  it("doubles quotes inside fields", () => {
    const csv = toCSV([{ a: 'he said "hi"' }], ["a"]);
    expect(csv).toContain('"he said ""hi"""');
  });

  it("preserves embedded newlines (the multi-line brief case)", () => {
    const csv = toCSV([{ brief: "line1\nline2" }], ["brief"]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders nulls / undefined as empty quoted fields", () => {
    const csv = toCSV([{ a: null, b: undefined }], ["a", "b"]);
    expect(csv).toContain('"",""');
  });

  it("ends rows with CRLF", () => {
    const csv = toCSV([{ a: "x" }], ["a"]);
    expect(csv).toMatch(/"a"\r\n"x"\r\n$/);
  });
});

describe("csv / csvFilename", () => {
  it("appends an ISO date stamp and .csv extension", () => {
    const name = csvFilename("projects");
    expect(name).toMatch(/^projects-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
