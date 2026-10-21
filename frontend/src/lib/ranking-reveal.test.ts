import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRankingsForReveal,
  getRankingReveal,
} from "./ranking-reveal";

test("keeps quarters without a campaign fully revealed", () => {
  assert.deepEqual(
    getRankingReveal("Q1_2026", "emerging", new Date("2026-07-16T08:00:00.000Z")),
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
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-20T07:59:59.999Z")),
    {
      visibleFromRank: 101,
      totalRankCount: 100,
      teaserRanks: [98, 99, 100],
      nextRevealAt: "2026-07-20T08:00:00.000Z",
    },
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-20T08:00:00.000Z")),
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
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-21T08:00:00.000Z"),
    ).visibleFromRank,
    41,
  );
  assert.equal(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-24T08:00:00.000Z"),
    ).visibleFromRank,
    11,
  );
  // The weekend holds Friday's batch until Monday's step fires.
  assert.equal(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-26T12:00:00.000Z"),
    ).visibleFromRank,
    11,
  );
  assert.equal(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-27T08:00:00.000Z"),
    ).visibleFromRank,
    4,
  );
});

test("shrinks the teaser stack as the reveal reaches the podium", () => {
  assert.deepEqual(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-28T08:00:00.000Z"))
      .teaserRanks,
    [1, 2],
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-29T08:00:00.000Z"))
      .teaserRanks,
    [1],
  );
  assert.deepEqual(
    getRankingReveal("Q2_2026", "emerging", new Date("2026-07-30T08:00:00.000Z")),
    {
      visibleFromRank: 1,
      totalRankCount: 100,
      teaserRanks: [],
      nextRevealAt: null,
    },
  );
});

test("keeps Q3 fully hidden in both divisions on October 21", () => {
  for (const division of ["emerging", "scaling"] as const) {
    assert.deepEqual(
      getRankingReveal("Q3_2026", division, new Date("2026-10-21T13:00:00.000Z")),
      {
        visibleFromRank: 101,
        totalRankCount: 100,
        teaserRanks: [98, 99, 100],
        nextRevealAt:
          division === "emerging" ? "2026-10-22T08:00:00.000Z" : "2026-10-22T12:00:00.000Z",
      },
    );
  }
});

test("reveals Q3 emerging at 10:00 and scaling at 14:00 Europe/Paris", () => {
  const at = (division: "emerging" | "scaling", iso: string) =>
    getRankingReveal("Q3_2026", division, new Date(iso)).visibleFromRank;
  // Thursday: emerging is live at 10:00 Paris while scaling waits for 14:00.
  assert.equal(at("emerging", "2026-10-22T07:59:59.999Z"), 101);
  assert.equal(at("emerging", "2026-10-22T08:00:00.000Z"), 26);
  assert.equal(at("scaling", "2026-10-22T11:59:59.999Z"), 101);
  assert.equal(at("scaling", "2026-10-22T12:00:00.000Z"), 26);
  assert.equal(at("emerging", "2026-10-23T08:00:00.000Z"), 11);
  assert.equal(at("scaling", "2026-10-23T12:00:00.000Z"), 11);
  // Weekend holds Friday's batch; Paris is UTC+1 from October 25.
  assert.equal(at("emerging", "2026-10-26T08:59:59.999Z"), 11);
  assert.equal(at("emerging", "2026-10-26T09:00:00.000Z"), 4);
  assert.equal(at("scaling", "2026-10-26T12:59:59.999Z"), 11);
  assert.equal(at("scaling", "2026-10-26T13:00:00.000Z"), 4);
  for (const [day, rank] of [["27", 3], ["28", 2], ["29", 1]] as const) {
    assert.equal(at("emerging", `2026-10-${day}T09:00:00.000Z`), rank);
    assert.equal(at("scaling", `2026-10-${day}T12:59:59.999Z`), rank + 1);
    assert.equal(at("scaling", `2026-10-${day}T13:00:00.000Z`), rank);
  }
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
    () => getRankingReveal("Q2_2026", "emerging", new Date("invalid")),
    /valid date/,
  );
});
