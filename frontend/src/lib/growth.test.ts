import assert from "node:assert/strict";
import test from "node:test";

import { calculateRankingGrowthRate, formatGrowthMultiplier } from "./growth";

test("formats fractional growth rates as total multipliers", () => {
  assert.equal(formatGrowthMultiplier(175), "176×");
  assert.equal(formatGrowthMultiplier(0.76), "1.76×");
  assert.equal(formatGrowthMultiplier(0.0152752116), "1.02×");
  assert.equal(formatGrowthMultiplier(0), "1×");
  assert.equal(formatGrowthMultiplier(-0.125), "0.875×");
  assert.equal(formatGrowthMultiplier(0.0001), "1.0001×");
  assert.equal(formatGrowthMultiplier(null), "—");
});

test("rejects invalid growth rates instead of rendering invalid multipliers", () => {
  assert.throws(() => formatGrowthMultiplier(Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => formatGrowthMultiplier(Number.NaN), RangeError);
  assert.throws(() => formatGrowthMultiplier(-1.01), RangeError);
});

test("calculates ranking growth from the padded baseline", () => {
  assert.equal(calculateRankingGrowthRate(1, 176, 100), 0.76);
  assert.equal(calculateRankingGrowthRate(120, 180, 100), 0.5);
  assert.equal(calculateRankingGrowthRate(null, 180, 100), null);
});

test("rejects invalid ranking growth inputs", () => {
  assert.throws(() => calculateRankingGrowthRate(1, 176, 0), RangeError);
  assert.throws(
    () => calculateRankingGrowthRate(1, Number.POSITIVE_INFINITY, 100),
    RangeError,
  );
});
