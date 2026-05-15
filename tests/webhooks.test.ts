import { describe, it, expect, beforeEach, vi } from "vitest";
import { notifyInquiryWebhook, _internal } from "@/lib/webhooks";

describe("webhooks / builders", () => {
  it("slack body includes title, model, link", () => {
    const body = _internal.buildSlackBody({
      projectId: "p1",
      projectTitle: "여름 캠페인",
      modelName: "Luna",
      clientCompany: "Acme",
      clientEmail: "buyer@acme.test",
      briefExcerpt: "긴 텍스트".repeat(100),
      budgetRange: "1,000~3,000만원",
    });
    expect(body.text).toContain("여름 캠페인");
    expect(body.text).toContain("Luna");
    expect(body.text).toContain("Acme");
    expect(body.text).toContain("buyer@acme.test");
    expect(body.text).toContain("1,000~3,000만원");
    expect(body.text).toContain("/admin/inbox#project-p1");
  });

  it("slack body collapses multi-line briefs", () => {
    const body = _internal.buildSlackBody({
      projectId: "p1",
      projectTitle: "x",
      modelName: null,
      clientCompany: null,
      clientEmail: null,
      briefExcerpt: "line1\nline2\nline3",
    });
    expect(body.text).toContain("line1 line2 line3");
  });

  it("discord body uses an embed and skips missing fields", () => {
    const body = _internal.buildDiscordBody({
      projectId: "p2",
      projectTitle: "Capsule",
      modelName: "Aria",
      clientCompany: null,
      clientEmail: null,
      briefExcerpt: "core idea",
    });
    expect(body.embeds).toHaveLength(1);
    const embed = body.embeds[0];
    expect(embed.title).toContain("Capsule");
    const fieldNames = embed.fields.map((f) => f.name);
    expect(fieldNames).toContain("모델");
    expect(fieldNames).not.toContain("회사");
    expect(fieldNames).not.toContain("이메일");
  });
});

describe("webhooks / notifyInquiryWebhook", () => {
  beforeEach(() => {
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it("reports sent=0 when no env vars are configured", async () => {
    const r = await notifyInquiryWebhook({
      projectId: "p1",
      projectTitle: "x",
      modelName: null,
      clientCompany: null,
      clientEmail: null,
      briefExcerpt: null,
    });
    expect(r.sent).toBe(0);
  });

  it("fires both providers when both URLs are set, swallows failures", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/x";
    process.env.DISCORD_WEBHOOK_URL = "https://discord.test/x";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 200 }));

    const r = await notifyInquiryWebhook({
      projectId: "p1",
      projectTitle: "x",
      modelName: "Luna",
      clientCompany: "Acme",
      clientEmail: "a@b.c",
      briefExcerpt: "hi",
    });

    expect(r.sent).toBe(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it("does not throw when a provider returns 500", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/x";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("nope", { status: 500 }));

    await expect(
      notifyInquiryWebhook({
        projectId: "p1",
        projectTitle: "x",
        modelName: null,
        clientCompany: null,
        clientEmail: null,
        briefExcerpt: null,
      })
    ).resolves.toBeDefined();
    fetchSpy.mockRestore();
  });
});
