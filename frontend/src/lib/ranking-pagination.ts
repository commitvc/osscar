import type { Org } from "@/types";

export const RANKINGS_PER_PAGE = 25;

export type RankingPageRange = {
  startRank: number;
  endRank: number;
};

export function getRankingPageCount(totalRankCount: number): number {
  return Math.ceil(totalRankCount / RANKINGS_PER_PAGE);
}

function getRankingPageIndex(rank: number): number {
  return Math.floor((rank - 1) / RANKINGS_PER_PAGE);
}

export function getFirstAvailableRankingPageIndex(
  visibleFromRank: number,
  totalRankCount: number,
): number {
  // Before the first reveal batch, visibleFromRank sits past the end of the
  // table; pagination then rests on the final page, where the teasers live.
  return getRankingPageIndex(Math.min(visibleFromRank, totalRankCount));
}

export function getAvailableRankingPageCount(
  visibleFromRank: number,
  totalRankCount: number,
): number {
  return (
    getRankingPageCount(totalRankCount) -
    getFirstAvailableRankingPageIndex(visibleFromRank, totalRankCount)
  );
}

export function getAvailableRankingPageNumber(
  pageIndex: number,
  visibleFromRank: number,
  totalRankCount: number,
): number {
  return (
    pageIndex -
    getFirstAvailableRankingPageIndex(visibleFromRank, totalRankCount) +
    1
  );
}

export function getRankingPageRange(
  pageIndex: number,
  totalRankCount: number,
): RankingPageRange {
  return {
    startRank: pageIndex * RANKINGS_PER_PAGE + 1,
    endRank: Math.min(
      (pageIndex + 1) * RANKINGS_PER_PAGE,
      totalRankCount,
    ),
  };
}

export function filterRankingsForPage<
  T extends Pick<Org, "division_rank">,
>(rankings: readonly T[], pageIndex: number): T[] {
  const startRank = pageIndex * RANKINGS_PER_PAGE + 1;
  const endRank = (pageIndex + 1) * RANKINGS_PER_PAGE;

  return rankings.filter(
    (org) =>
      org.division_rank >= startRank && org.division_rank <= endRank,
  );
}
