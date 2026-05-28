import { describe, it, expect } from "vitest";
import { characterFaqKo, characterFaqEn } from "@/lib/characters/faq";
import { getCharacter } from "@/lib/characters/registry";

describe("character FAQ (KR + EN)", () => {
  it("KR FAQ surfaces 8 entries per character — covers solo, market, exclusivity, IP, preview, disclosure, acceptance QA, paired-vs-license", () => {
    const yuna = getCharacter("yuna")!;
    const faq = characterFaqKo(yuna);
    expect(faq).toHaveLength(8);
    for (const e of faq) {
      expect(e.question.length).toBeGreaterThan(0);
      expect(e.answer.length).toBeGreaterThan(40);
    }
  });

  it("EN FAQ surfaces 8 entries per character", () => {
    const ren = getCharacter("ren")!;
    const faq = characterFaqEn(ren);
    expect(faq).toHaveLength(8);
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
    const koCompliance = ko.find((e) => e.answer.includes("EU AI Act"))!;
    const enCompliance = en.find((e) => e.answer.includes("EU AI Act"))!;
    expect(koCompliance.answer).toMatch(/FTC/);
    expect(enCompliance.answer).toMatch(/FTC/);
  });

  it("Acceptance QA entry references the published checklist post (KR + EN)", () => {
    const yuna = getCharacter("yuna")!;
    const ko = characterFaqKo(yuna);
    const en = characterFaqEn(yuna);
    const koQa = ko.find((e) =>
      e.question.includes("결제") || e.question.includes("검수")
    );
    const enQa = en.find((e) => e.question.toLowerCase().includes("verify"));
    expect(koQa?.answer).toMatch(/qa-checklist-ko/);
    expect(enQa?.answer).toMatch(/qa-checklist-before-paying/);
  });

  it("Paired-vs-license entry surfaces the break-even threshold + calculator link", () => {
    const yuna = getCharacter("yuna")!;
    const ko = characterFaqKo(yuna);
    const en = characterFaqEn(yuna);
    const koPv = ko.find((e) => e.question.includes("라이선스") && e.question.includes("paired"));
    const enPv = en.find(
      (e) =>
        e.question.toLowerCase().includes("license") &&
        e.question.toLowerCase().includes("paired")
    );
    expect(koPv?.answer).toMatch(/14/);
    expect(koPv?.answer).toMatch(/pricing-calculator/);
    expect(enPv?.answer).toMatch(/14/);
    expect(enPv?.answer).toMatch(/pricing-calculator/);
  });
});
