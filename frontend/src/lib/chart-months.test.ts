import assert from "node:assert/strict";
import test from "node:test";
import {
  alignToQuarterBuckets,
  formatMonthTick,
  getMonthlyTickDates,
  getQuarterBucketDates,
} from "./chart-months";

test("creates one chart tick for each calendar month", () => {
  const ticks = getMonthlyTickDates([
    { date: "2026-04-05" },
    { date: "2026-04-12" },
    { date: "2026-04-26" },
    { date: "2026-05-03" },
    { date: "2026-05-31" },
    { date: "2026-06-07" },
    { date: "2026-06-28" },
  ]);

  assert.deepEqual(ticks, [
    "2026-04-05",
    "2026-05-03",
    "2026-06-07",
  ]);
  assert.deepEqual(ticks.map(formatMonthTick), ["Apr", "May", "Jun"]);
});

test("formats months without depending on the browser timezone", () => {
  assert.equal(formatMonthTick("2026-04-01"), "Apr");
  assert.equal(formatMonthTick("2026-06-30"), "Jun");
});

test("rejects malformed chart dates", () => {
  assert.throws(
    () => getMonthlyTickDates([{ date: "April 5, 2026" }]),
    /Invalid chart date/,
  );
  assert.throws(() => formatMonthTick("2026-13-01"), /Invalid chart date/);
  assert.throws(() => formatMonthTick("2026-02-30"), /Invalid chart date/);
});

test("lists every Sunday bucket of the quarter", () => {
  const buckets = getQuarterBucketDates("2026-07-01", "2026-09-30");
  assert.equal(buckets.length, 13);
  assert.equal(buckets[0], "2026-07-05");
  assert.equal(buckets[12], "2026-09-27");
});

test("keeps weeks without data empty instead of zero", () => {
  const buckets = getQuarterBucketDates("2026-07-01", "2026-09-30");
  const aligned = alignToQuarterBuckets(
    [
      { date: "2026-09-20", value: 433 },
      { date: "2026-09-27", value: 547 },
    ],
    buckets,
  );
  assert.equal(aligned.length, 13);
  assert.equal(aligned[0]!.value, null);
  assert.deepEqual(aligned.slice(-2), [
    { date: "2026-09-20", value: 433 },
    { date: "2026-09-27", value: 547 },
  ]);
});

test("rejects points outside the quarter buckets", () => {
  assert.throws(
    () => alignToQuarterBuckets([{ date: "2026-10-04", value: 1 }], getQuarterBucketDates("2026-07-01", "2026-09-30")),
    /not a quarter bucket/,
  );
});
