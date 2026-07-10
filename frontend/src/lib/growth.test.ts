import assert from "node:assert/strict";
import test from "node:test";

import { calculateRankingGrowthRate, formatGrowthRate } from "./growth";

test("formats fractional growth rates as signed percentages", () => {
  assert.equal(formatGrowthRate(175), "+17,500%");
  assert.equal(formatGrowthRate(0.76), "+76%");
  assert.equal(formatGrowthRate(0.0152752116), "+1.53%");
  assert.equal(formatGrowthRate(0), "0%");
  assert.equal(formatGrowthRate(-0.125), "-12.5%");
  assert.equal(formatGrowthRate(0.0001), "+0.01%");
  assert.equal(formatGrowthRate(null), "—");
});

test("rejects non-finite growth rates instead of rendering invalid labels", () => {
  assert.throws(() => formatGrowthRate(Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => formatGrowthRate(Number.NaN), RangeError);
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
