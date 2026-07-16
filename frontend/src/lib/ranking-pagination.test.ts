import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRankingsForPage,
  getAvailableRankingPageCount,
  getAvailableRankingPageNumber,
  getFirstAvailableRankingPageIndex,
  getRankingPageCount,
  getRankingPageRange,
} from "./ranking-pagination";

test("keeps the top 100 in four permanent 25-rank pages", () => {
  assert.equal(getRankingPageCount(100), 4);
  assert.deepEqual(getRankingPageRange(0, 100), {
    startRank: 1,
    endRank: 25,
  });
  assert.deepEqual(getRankingPageRange(1, 100), {
    startRank: 26,
    endRank: 50,
  });
  assert.deepEqual(getRankingPageRange(2, 100), {
    startRank: 51,
    endRank: 75,
  });
  assert.deepEqual(getRankingPageRange(3, 100), {
    startRank: 76,
    endRank: 100,
  });
});

test("places reveal starting ranks in their final page", () => {
  assert.equal(getFirstAvailableRankingPageIndex(51, 100), 2);
  assert.equal(getFirstAvailableRankingPageIndex(41, 100), 1);
  assert.equal(getFirstAvailableRankingPageIndex(21, 100), 0);
  assert.equal(getFirstAvailableRankingPageIndex(1, 100), 0);
});

test("rests on the final page before the first reveal batch", () => {
  assert.equal(getFirstAvailableRankingPageIndex(101, 100), 3);
  assert.equal(getAvailableRankingPageCount(101, 100), 1);
  assert.equal(getAvailableRankingPageNumber(3, 101, 100), 1);
});

test("numbers only the pages available during a reveal", () => {
  assert.equal(getAvailableRankingPageNumber(1, 41, 100), 1);
  assert.equal(getAvailableRankingPageNumber(2, 41, 100), 2);
  assert.equal(getAvailableRankingPageNumber(3, 41, 100), 3);
  assert.equal(getAvailableRankingPageCount(41, 100), 3);

  assert.equal(getAvailableRankingPageNumber(0, 21, 100), 1);
  assert.equal(getAvailableRankingPageCount(21, 100), 4);
  assert.equal(getAvailableRankingPageCount(1, 100), 4);
});

test("filters rankings by permanent rank boundaries", () => {
  const rankings = [
    { division_rank: 41, owner: "forty-first" },
    { division_rank: 50, owner: "fiftieth" },
    { division_rank: 51, owner: "fifty-first" },
    { division_rank: 75, owner: "seventy-fifth" },
    { division_rank: 76, owner: "seventy-sixth" },
  ];

  assert.deepEqual(filterRankingsForPage(rankings, 1), [
    { division_rank: 41, owner: "forty-first" },
    { division_rank: 50, owner: "fiftieth" },
  ]);
  assert.deepEqual(filterRankingsForPage(rankings, 2), [
    { division_rank: 51, owner: "fifty-first" },
    { division_rank: 75, owner: "seventy-fifth" },
  ]);
});
