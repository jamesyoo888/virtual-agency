import { describe, it, expect } from "vitest";
import { stripSelfAgentAttribution } from "@/lib/analytics/attribution-guards";

describe("stripSelfAgentAttribution", () => {
  it("strips utm when agent is referring themselves", () => {
    const out = stripSelfAgentAttribution({
      utmSource: "agent",
      utmCampaign: "user-abc",
      userId: "user-abc",
    });
    expect(out.cleanedUtmSource).toBeNull();
    expect(out.cleanedUtmCampaign).toBeNull();
  });

  it("passes through utm when agent refers a different user", () => {
    const out = stripSelfAgentAttribution({
      utmSource: "agent",
      utmCampaign: "agent-xyz",
      userId: "buyer-123",
    });
    expect(out.cleanedUtmSource).toBe("agent");
    expect(out.cleanedUtmCampaign).toBe("agent-xyz");
  });

  it("passes through unrelated utm sources unchanged even if campaign matches userId", () => {
    // Defensive: only the (agent, self) tuple gets stripped. The same
    // userId being passed as utm_campaign on a different source is just
    // coincidence and not our concern here.
    const out = stripSelfAgentAttribution({
      utmSource: "character",
      utmCampaign: "user-abc",
      userId: "user-abc",
    });
    expect(out.cleanedUtmSource).toBe("character");
    expect(out.cleanedUtmCampaign).toBe("user-abc");
  });

  it("passes through nulls without throwing", () => {
    const out = stripSelfAgentAttribution({
      utmSource: null,
      utmCampaign: null,
      userId: "buyer-123",
    });
    expect(out.cleanedUtmSource).toBeNull();
    expect(out.cleanedUtmCampaign).toBeNull();
  });

  it("agent with no campaign passes through (no self-loop to guard against)", () => {
    const out = stripSelfAgentAttribution({
      utmSource: "agent",
      utmCampaign: null,
      userId: "buyer-123",
    });
    expect(out.cleanedUtmSource).toBe("agent");
    expect(out.cleanedUtmCampaign).toBeNull();
  });
});
