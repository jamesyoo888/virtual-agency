import { describe, it, expect } from "vitest";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

describe("itemListLd", () => {
  it("emits schema.org ItemList with position numbering", () => {
    const ld = itemListLd("Test List", [
      { name: "First", url: "https://example.com/1" },
      { name: "Second", url: "https://example.com/2", image: "https://example.com/og2.png" },
    ]);
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.name).toBe("Test List");
    expect(ld.numberOfItems).toBe(2);
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
    expect(ld.itemListElement[1].image).toBe("https://example.com/og2.png");
    expect(ld.itemListElement[0].image).toBeUndefined();
  });

  it("handles empty list without erroring", () => {
    const ld = itemListLd("Empty", []);
    expect(ld.numberOfItems).toBe(0);
    expect(ld.itemListElement).toHaveLength(0);
  });

  it("ldScript escapes </script> in payloads", () => {
    const ld = itemListLd("X", [{ name: "</script><iframe>", url: "x" }]);
    const out = ldScript(ld);
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script");
  });
});
