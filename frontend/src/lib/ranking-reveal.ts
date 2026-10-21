import type { Org } from "@/types";

type RankingRevealStep = {
  startsAt: string;
  visibleFromRank: number;
};

type RankingRevealCampaign = {
  totalRankCount: number;
  teaserCount: number;
  steps: readonly RankingRevealStep[];
};

// Batches land at 08:00 UTC (10:00 Europe/Paris) on weekdays. Nothing is
// revealed before the first step fires.
const RANKING_REVEAL_CAMPAIGNS: Readonly<
  Record<string, RankingRevealCampaign>
> = {
  Q2_2026: {
    totalRankCount: 100,
    teaserCount: 3,
    steps: [
      { startsAt: "2026-07-20T08:00:00.000Z", visibleFromRank: 51 },
      { startsAt: "2026-07-21T08:00:00.000Z", visibleFromRank: 41 },
      { startsAt: "2026-07-22T08:00:00.000Z", visibleFromRank: 31 },
      { startsAt: "2026-07-23T08:00:00.000Z", visibleFromRank: 21 },
      { startsAt: "2026-07-24T08:00:00.000Z", visibleFromRank: 11 },
      { startsAt: "2026-07-27T08:00:00.000Z", visibleFromRank: 4 },
      { startsAt: "2026-07-28T08:00:00.000Z", visibleFromRank: 3 },
      { startsAt: "2026-07-29T08:00:00.000Z", visibleFromRank: 2 },
      { startsAt: "2026-07-30T08:00:00.000Z", visibleFromRank: 1 },
    ],
  },
  // Compressed reveal agreed on 2026-10-21: everything stays hidden until
  // Thursday, then 100-26, 25-11, 10-4, #3, #2, #1 at 10:00 Europe/Paris.
  // Paris leaves summer time on 2026-10-25, so 10:00 is 08:00 UTC before
  // that date and 09:00 UTC after it.
  Q3_2026: {
    totalRankCount: 100,
    teaserCount: 3,
    steps: [
      { startsAt: "2026-10-22T08:00:00.000Z", visibleFromRank: 26 },
      { startsAt: "2026-10-23T08:00:00.000Z", visibleFromRank: 11 },
      { startsAt: "2026-10-26T09:00:00.000Z", visibleFromRank: 4 },
      { startsAt: "2026-10-27T09:00:00.000Z", visibleFromRank: 3 },
      { startsAt: "2026-10-28T09:00:00.000Z", visibleFromRank: 2 },
      { startsAt: "2026-10-29T09:00:00.000Z", visibleFromRank: 1 },
    ],
  },
};

export type RankingReveal = {
  visibleFromRank: number;
  totalRankCount: number;
  teaserRanks: number[];
  nextRevealAt: string | null;
};

const FULL_REVEAL: RankingReveal = {
  visibleFromRank: 1,
  totalRankCount: 100,
  teaserRanks: [],
  nextRevealAt: null,
};

function buildTeaserRanks(
  visibleFromRank: number,
  teaserCount: number,
): number[] {
  const firstTeaserRank = Math.max(1, visibleFromRank - teaserCount);
  return Array.from(
    { length: visibleFromRank - firstTeaserRank },
    (_, index) => firstTeaserRank + index,
  );
}

export function getRankingReveal(
  quarterId: string,
  now: Date = new Date(),
): RankingReveal {
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) {
    throw new RangeError("Ranking reveal time must be a valid date.");
  }

  const campaign = RANKING_REVEAL_CAMPAIGNS[quarterId];
  if (!campaign) return FULL_REVEAL;

  let visibleFromRank = campaign.totalRankCount + 1;
  let nextRevealAt: string | null = null;

  for (const step of campaign.steps) {
    const startsAtMs = Date.parse(step.startsAt);
    if (startsAtMs <= nowMs) {
      visibleFromRank = step.visibleFromRank;
      continue;
    }

    nextRevealAt = step.startsAt;
    break;
  }

  return {
    visibleFromRank,
    totalRankCount: campaign.totalRankCount,
    teaserRanks: buildTeaserRanks(visibleFromRank, campaign.teaserCount),
    nextRevealAt,
  };
}

export function filterRankingsForReveal<T extends Pick<Org, "division_rank">>(
  rankings: readonly T[],
  reveal: RankingReveal,
): T[] {
  return rankings.filter(
    (org) =>
      org.division_rank >= reveal.visibleFromRank &&
      org.division_rank <= reveal.totalRankCount,
  );
}
