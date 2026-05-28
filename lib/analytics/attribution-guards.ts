/**
 * Attribution self-loop guards. Run at inquiry-insert time so the projects
 * table never persists a row where the attribution credits the inquirer
 * themselves — that would either inflate agent commissions or mislead the
 * referral-thanks notification.
 */

export interface SelfAgentInput {
  utmSource: string | null;
  utmCampaign: string | null;
  userId: string;
}

export interface CleanedUtm {
  cleanedUtmSource: string | null;
  cleanedUtmCampaign: string | null;
}

/**
 * If an agent submits an inquiry through their own referral link
 * (`utm_source=agent&utm_campaign=<their own client id>`), strip both
 * fields. The inquiry still lands; it just doesn't show up in agent
 * attribution and doesn't credit the 15% commission. Returns the
 * original values unchanged in every other case.
 */
export function stripSelfAgentAttribution(
  input: SelfAgentInput
): CleanedUtm {
  if (
    input.utmSource === "agent" &&
    input.utmCampaign &&
    input.utmCampaign === input.userId
  ) {
    return { cleanedUtmSource: null, cleanedUtmCampaign: null };
  }
  return {
    cleanedUtmSource: input.utmSource,
    cleanedUtmCampaign: input.utmCampaign,
  };
}
