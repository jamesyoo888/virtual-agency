import { describe, it, expect } from "vitest";
import { howToLd } from "@/lib/seo/json-ld";

describe("howToLd", () => {
  it("emits HowTo schema with positioned steps", () => {
    const ld = howToLd({
      name: "브리프 작성법",
      description: "5가지 필드",
      url: "https://example.com/blog/brief",
      totalTime: "PT4M",
      steps: [
        { name: "톤 고정", text: "3 단어로 잠근다" },
        { name: "사용처 명시", text: "출력 매체 명시" },
      ],
    });
    expect(ld["@type"]).toBe("HowTo");
    expect(ld.totalTime).toBe("PT4M");
    expect(ld.step).toHaveLength(2);
    expect(ld.step[0].position).toBe(1);
    expect(ld.step[0].url).toBe("https://example.com/blog/brief#step-1");
    expect(ld.step[1].position).toBe(2);
  });

  it("omits totalTime when not provided", () => {
    const ld = howToLd({
      name: "x",
      description: "y",
      url: "https://example.com/x",
      steps: [{ name: "a", text: "b" }],
    });
    expect("totalTime" in ld).toBe(false);
  });
});
