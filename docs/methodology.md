# Methodology

This document describes how the OSSCAR Index is computed — a walkthrough of the decisions behind the index: what we measure, how we score it, the alternatives we tested, and the reasoning that got us here. For the executable implementation, see [`methodology/compute_index.py`](../methodology/compute_index.py). For how the input data is collected, see [data-collection.md](data-collection.md).

## Overview

The OSSCAR Index ranks the fastest-growing GitHub organizations each quarter. We focus on organization accounts (excluding personal accounts and forks), split them into two divisions by starting star count so smaller and larger ecosystems are evaluated among peers, measure growth across three signals (GitHub stars, contributors, and package downloads from npm, PyPI, and Cargo), normalize each signal within its division using a log–minmax transform, and combine the resulting scores into a single composite via the L² norm. Organizations are then ranked by this composite within their division.

Two principles drive the design:

1. **We measure growth, not absolute size** — so established projects that have plateaued don't crowd out emerging momentum.
2. **Coverage varies across ecosystems** — so the method must remain fair when some signals are missing.

## Step 01 — Filter to GitHub organizations

The first decision was what to rank. We considered three units of analysis: individual repositories, GitHub organizations, and companies.

- **Repositories** would have given us the most granularity, but the same entity could easily appear in the ranking several times under different repos.
- **Companies** would be a clean option, but they're a more abstract concept. Matching orgs to companies means pulling in external data sources, and many interesting non-commercial projects would fall out of the index entirely.
- **Organizations** sat in the middle, so the index is restricted to GitHub accounts of type `organization`. Personal accounts and forks are excluded.

## Step 02 — Assign to a division

Organizations are split into two independent leaderboards based on their GitHub star count at the **start** of the quarter:

| Division | Criteria |
|---|---|
| `emerging` | `stars_start < 1,000` |
| `scaling`  | `stars_start ≥ 1,000` |

Divisions are kept separate because growth at 100 stars doesn't look like growth at 100,000 stars. Scoring and ranking happen within each division on its own.

Division is **locked at quarter start**. If an org crosses 1,000 stars during the quarter, it still stays in the emerging tier for that quarter's results.

## Step 03 — Measure three growth signals

We track three signals per org. These are the ones we could collect consistently at scale from public sources, and together they cover attention (stars), contribution (contributors), and actual usage (downloads).

| Signal | Family | Description |
|---|---|---|
| `github_stars` | github | Net new stars on the org's repos |
| `github_contributors` | github | Unique contributors across the org's repos |
| `package_downloads` | usage | Aggregated download count across npm, PyPI, and Cargo (sum of available registries) |

One constraint showed up immediately: not every org has every metric. A pure Python library has no npm or Cargo downloads. An infra project without published packages has no download data at all. Any scoring scheme had to work with a variable number of available signals without punishing orgs just for not publishing packages. That constraint shaped the eligibility rules below and, later, the aggregation choice in step 05.

### Package download aggregation

Package downloads sum across npm, PyPI, and Cargo. If an org publishes to only one or two registries, we sum the available values instead of penalizing it for the ones it's missing. An org with no data across all three registries gets a null for this signal.

### Growth rate

For each signal, we record the value at the start and end of the quarter and compute the raw quarterly growth rate:

```
growth_rate = (end − start) / start
```

This is the rate shown in the published data and the UI.

### Padded start (scoring only)

For ranking, we divide instead by a *padded start*: whichever is larger, the actual start value or a minimum threshold.

```
padded_start  = max(start, padding_threshold)
scoring_rate  = (end − padded_start) / padded_start
```

This prevents tiny absolute changes from producing outsized rank gains. Going from 2 to 4 stars shouldn't outrank a project going from 5,000 to 8,000 stars. The padded rate only feeds the scoring step below — it's never shown as the displayed growth.

Padding thresholds differ by division to reflect the different scales of orgs in each tier:

| Signal | Below 1,000 stars | Above 1,000 stars |
|---|---|---|
| `github_stars` | 100 | 1,000 |
| `github_contributors` | 1 | 5 |
| `package_downloads` | 1,000 | 10,000 |

These numbers aren't arbitrary. For each signal, the threshold is set to roughly the 10th percentile of that signal within the division, so only orgs sitting in the noise floor end up padded.

### Eligibility

An organization is eligible for a given signal only when **all three** hold:

- Both start and end values are present (not null).
- The end value meets or exceeds the padding threshold.
- The padded growth rate is ≥ 0 (we reward growth, not decline).

Signals that fail any of these conditions are excluded for that organization. The organization can still be scored on the remaining eligible signals.

## Step 04 — Score growth via log-minmax scaling

Raw growth rates can't be compared directly across signals. A 20% increase in stars means something very different from a 20% increase in package downloads. We needed a way to put every signal on the same scale so they could be combined later.

Our first attempt was straight percentile ranks. The appeal was obvious: every signal gets a `[0, 100]` score for free, with no tuning. The problem is that growth is heavily long-tailed — a 10× grower and a 1,000× grower can both land in the top 1%, but they're clearly not the same story. Percentiles collapsed that gap and flattened the top of the leaderboard.

We ended up with a two-step **log-minmax** transform for each signal within each division:

```
1. log_val = log(1 + growth_rate)
2. score   = (log_val − min) / (max − min) × 100
```

The logarithm compresses the long tail of growth rates while keeping real separation between a 10× and a 1,000× grower. The min-max step then maps the distribution to `[0, 100]`, so scores are directly comparable across signals.

We don't clip. If one org grows exceptionally fast, it anchors the maximum and pushes everyone else down. That's the point — an exceptional grower should stand out on the leaderboard, and log-minmax makes that visible in a way percentiles can't.

Both `min` and `max` are computed only over eligible organizations in the same division for that signal.

### Why log-minmax over alternatives

| Method | Problem |
|---|---|
| Raw percentile | Compresses all outliers toward the top — a 10× grower looks the same as a 1,000× grower |
| Raw log | A single extreme value compresses everyone else toward 0 |
| **Log-minmax** | Preserves outlier separation while keeping the scale bounded and comparable |

## Step 05 — Combine eligible scores via the L² norm

This was the step that took the most iteration. Because an org can have anywhere from one to three eligible signals, combining their scores into a single number is trickier than it first looks.

We started with a weighted sum — first with equal fixed weights, then with dynamic weights varying by growth magnitude and org size. It looked clean on paper, but we kept running into the same flaw: the weighted sum quietly penalizes orgs that happen to be active on more signals.

Here's the problem that convinced us to drop it. Take two orgs in the same division. Org A grew 100× on stars and 50× on package downloads. Org B grew 100× on stars and has no package data. With a weighted sum `w_stars · 100 + w_pkg · 50`, org A only beats org B when `w_pkg` is large. For reasonable weightings, org A ends up ranked below org B. That's backwards: org A matches B on stars and also has impressive package growth, and the scheme punishes it for having more data.

We moved to the **L² (Euclidean) norm** — the square root of the sum of squared scores:

```
composite_score = √(Σ score_i²)    (for each eligible signal i)
```

This fixes the weighted-sum problem directly. Per-signal scores are non-negative, so squaring and summing means an extra non-zero signal can only add to the composite. Org A now strictly beats org B.

### Why `p = 2` specifically

The L<sup>p</sup> norms are a whole family, parametrized by `p`. At `p = 1` you get the plain sum we just rejected. At `p = ∞` you get only the single largest signal, and everything else is ignored. `p = 2` sits in between as the familiar Euclidean norm. Squaring amplifies large values disproportionately, so a standout signal carries more weight than in a sum, while extra signals still push the composite up.

A few other properties fell out for free:

- **No weights to tune.** Every eligible signal enters on equal terms, which avoided a whole category of "what should `w_pkg` actually be?" debates.
- **Standout performance wins.** A score profile of `(100, 0, 0)` maps to `100`, while `(50, 50, 50)` maps to `≈ 86.6` rather than `150`. An exceptional result on one signal isn't drowned out by middling results on three.
- **Breadth still helps.** An org with two eligible signals scoring `(80, 60)` composites to `100`, ahead of a single-signal org scoring `80` on its own.

Signals with no data simply don't contribute to the sum of squares. An org that only publishes to GitHub is evaluated on two signals; one active across all three is evaluated on all three. The maximum possible composite is `√(3 × 100²) ≈ 173.2`.

## Step 06 — Rank within each division

Organizations are ranked by composite score in descending order, within each division on its own. Ties are broken by **minimum rank** — tied organizations share the same rank number (`pandas.rank(method="min")`).

Because division assignment is based on quarter-start stars (step 02), the ranking reflects growth over a full quarter against a consistent peer group.

## Limitations and what's next

- **First version.** This is the first version of the index, and the methodology will keep evolving. Expect signals, thresholds, and scoring choices to change as we iterate.
- **Weekly data collection.** Input data is snapshotted on a weekly cadence, so the start and end of a quarter rarely align with its exact first and last day. Instead, the quarter is bounded by the weekly snapshots closest to those dates. See [data-collection.md](data-collection.md) for details.
- **Package coverage.** We currently track downloads from three registries: npm, PyPI, and Cargo. Orgs that publish to other ecosystems (Maven, RubyGems, NuGet, Go modules, Hex, and others) are effectively ranked on stars and contributors alone. We plan to expand registry coverage over time.
- **Short-term growth bias.** Because the index measures a single quarter, mature projects that have plateaued at high adoption can rank poorly, even when they're foundational to their ecosystem. The index is a picture of momentum, not of importance.

The project is fully open source. If you spot something wrong, want to suggest a new signal, or want to discuss any step of the methodology, [open an issue on GitHub](https://github.com/commitvc/osscar).
