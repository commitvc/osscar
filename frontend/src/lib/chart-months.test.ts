import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMonthTick,
  getMonthlyTickDates,
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
