import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRankingsForReveal,
  getRankingReveal,
} from "./ranking-reveal";

test("keeps quarters without a campaign fully revealed", () => {
  assert.deepEqual(
    getRankingReveal("Q1_2026", new Date("2026-07-16T08:00:00.000Z")),
    {
      visibleFromRank: 1,
      totalRankCount: 100,
      teaserRanks: [],
      nextRevealAt: null,
    },
  );
});

test("reveals Q2 batches at 10:00 Europe/Paris on the scheduled dates", () => {
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-16T07:59:59.999Z")),
    {
      visibleFromRank: 51,
      totalRankCount: 100,
      teaserRanks: [48, 49, 50],
      nextRevealAt: "2026-07-16T08:00:00.000Z",
    },
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-16T08:00:00.000Z")),
    {
      visibleFromRank: 41,
      totalRankCount: 100,
      teaserRanks: [38, 39, 40],
      nextRevealAt: "2026-07-17T08:00:00.000Z",
    },
  );
  assert.equal(
    getRankingReveal(
      "Q2_2026",
      new Date("2026-07-20T08:00:00.000Z"),
    ).visibleFromRank,
    21,
  );
  assert.equal(
    getRankingReveal(
      "Q2_2026",
      new Date("2026-07-24T08:00:00.000Z"),
    ).visibleFromRank,
    4,
  );
});

test("shrinks the teaser stack as the reveal reaches the podium", () => {
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-27T08:00:00.000Z"))
      .teaserRanks,
    [1, 2],
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-28T08:00:00.000Z"))
      .teaserRanks,
    [1],
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-29T08:00:00.000Z")),
    {
      visibleFromRank: 1,
      totalRankCount: 100,
      teaserRanks: [],
      nextRevealAt: null,
    },
  );
});

test("filters only the unrevealed leading ranks without renumbering entries", () => {
  const rankings = [
    { division_rank: 1, owner: "first" },
    { division_rank: 40, owner: "fortieth" },
    { division_rank: 41, owner: "forty-first" },
    { division_rank: 100, owner: "hundredth" },
    { division_rank: 101, owner: "outside-frontend" },
  ];

  assert.deepEqual(
    filterRankingsForReveal(rankings, {
      visibleFromRank: 41,
      totalRankCount: 100,
      teaserRanks: [38, 39, 40],
      nextRevealAt: null,
    }),
    [
      { division_rank: 41, owner: "forty-first" },
      { division_rank: 100, owner: "hundredth" },
    ],
  );
});

test("rejects invalid reveal times", () => {
  assert.throws(
    () => getRankingReveal("Q2_2026", new Date("invalid")),
    /valid date/,
  );
});
