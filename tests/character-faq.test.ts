import { describe, it, expect } from "vitest";
import { characterFaqKo, characterFaqEn } from "@/lib/characters/faq";
import { getCharacter } from "@/lib/characters/registry";

describe("character FAQ (KR + EN)", () => {
  it("KR FAQ surfaces 6 entries per character — covers solo, market, exclusivity, IP, preview, disclosure", () => {
    const yuna = getCharacter("yuna")!;
    const faq = characterFaqKo(yuna);
    expect(faq).toHaveLength(6);
    for (const e of faq) {
      expect(e.question.length).toBeGreaterThan(0);
      expect(e.answer.length).toBeGreaterThan(40);
    }
  });

  it("EN FAQ surfaces 6 entries per character", () => {
    const ren = getCharacter("ren")!;
    const faq = characterFaqEn(ren);
    expect(faq).toHaveLength(6);
    for (const e of faq) {
      expect(e.question.length).toBeGreaterThan(0);
      expect(e.answer.length).toBeGreaterThan(40);
    }
  });

  it("FAQ mentions the character name in the first question (personalization)", () => {
    // Character.name is the canonical brand asset — "Yuna" / "Ren" carry over
    // to KR copy because Korean brands keep the same Latin name.
    const ren = getCharacter("ren")!;
    expect(characterFaqKo(ren)[0].question).toContain("Ren");
    expect(characterFaqEn(ren)[0].question).toContain("Ren");
  });

  it("FAQ surfaces target verticals in the exclusivity Q (buyer sees their industry)", () => {
    const yuna = getCharacter("yuna")!;
    const ko = characterFaqKo(yuna);
    const en = characterFaqEn(yuna);
    const koExcl = ko.find((e) => e.question.includes("독점"));
    const enExcl = en.find((e) =>
      e.question.toLowerCase().includes("exclusivity")
    );
    expect(koExcl?.answer).toContain("beauty");
    expect(enExcl?.answer).toContain("beauty");
  });

  it("Compliance Q references the global regulatory frame (EU AI Act + FTC + ASA + Korea)", () => {
    const yuna = getCharacter("yuna")!;
    const ko = characterFaqKo(yuna);
    const en = characterFaqEn(yuna);
    const koLast = ko[ko.length - 1].answer;
    const enLast = en[en.length - 1].answer;
    expect(koLast).toMatch(/EU AI Act/);
    expect(koLast).toMatch(/FTC/);
    expect(enLast).toMatch(/EU AI Act/);
    expect(enLast).toMatch(/FTC/);
  });
});
