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

test("hides every ranking until the first batch reveals 51-100", () => {
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-20T07:59:59.999Z")),
    {
      visibleFromRank: 101,
      totalRankCount: 100,
      teaserRanks: [98, 99, 100],
      nextRevealAt: "2026-07-20T08:00:00.000Z",
    },
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-20T08:00:00.000Z")),
    {
      visibleFromRank: 51,
      totalRankCount: 100,
      teaserRanks: [48, 49, 50],
      nextRevealAt: "2026-07-21T08:00:00.000Z",
    },
  );
});

test("reveals Q2 batches at 10:00 Europe/Paris on weekdays", () => {
  assert.equal(
    getRankingReveal(
      "Q2_2026",
      new Date("2026-07-21T08:00:00.000Z"),
    ).visibleFromRank,
    41,
  );
  assert.equal(
    getRankingReveal(
      "Q2_2026",
      new Date("2026-07-24T08:00:00.000Z"),
    ).visibleFromRank,
    11,
  );
  // The weekend holds Friday's batch until Monday's step fires.
  assert.equal(
    getRankingReveal(
      "Q2_2026",
      new Date("2026-07-26T12:00:00.000Z"),
    ).visibleFromRank,
    11,
  );
  assert.equal(
    getRankingReveal(
      "Q2_2026",
      new Date("2026-07-27T08:00:00.000Z"),
    ).visibleFromRank,
    6,
  );
});

test("shrinks the teaser stack as the reveal reaches the podium", () => {
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-30T08:00:00.000Z"))
      .teaserRanks,
    [1, 2],
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-07-31T08:00:00.000Z"))
      .teaserRanks,
    [1],
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", new Date("2026-08-03T08:00:00.000Z")),
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
