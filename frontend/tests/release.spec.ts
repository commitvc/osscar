import { expect, test, type Page } from "@playwright/test";
import {
  getAvailableRankingPageCount,
  getRankingPageIndex,
  getRankingPageRange,
} from "../src/lib/ranking-pagination";
import { getRankingReveal } from "../src/lib/ranking-reveal";

const releaseQuarterId = process.env.OSSCAR_RELEASE_QUARTER_ID ?? null;
const expectedQuarterLabel = process.env.OSSCAR_RELEASE_QUARTER_LABEL ?? null;
const expectedTopN = Number(process.env.OSSCAR_FRONTEND_TOP_N ?? "100");

type Division = "emerging" | "scaling";

function releasePath(path: string): string {
  if (!releaseQuarterId) return path;

  const url = new URL(path, "https://osscar.local");
  url.searchParams.set("quarter", releaseQuarterId);
  return `${url.pathname}${url.search}`;
}

async function selectedQuarterId(page: Page): Promise<string> {
  const quarterSelector = page.getByLabel("Quarter");
  await expect(quarterSelector).toBeVisible();
  const quarterId = await quarterSelector.inputValue();
  expect(quarterId, "selected quarter id").toMatch(/^Q[1-4]_\d{4}$/);
  return quarterId;
}

async function expectedRevealForPage(page: Page) {
  return getRankingReveal(await selectedQuarterId(page));
}

async function visibleRankingEntries(page: Page) {
  const reveal = await expectedRevealForPage(page);
  const firstPageIndex = getRankingPageIndex(reveal.visibleFromRank);
  const firstPageRange = getRankingPageRange(firstPageIndex, expectedTopN);
  const pageSize = firstPageRange.endRank - reveal.visibleFromRank + 1;
  const entries = page.locator('[data-testid="ranking-entry"]:visible');
  await expect(entries.first()).toBeVisible();
  await expect(entries).toHaveCount(pageSize);
  return entries;
}

async function selectDivision(page: Page, division: Division) {
  await page.getByTestId(`division-tab-${division}`).click();
  const reveal = await expectedRevealForPage(page);
  const firstPageIndex = getRankingPageIndex(reveal.visibleFromRank);
  const firstPageRange = getRankingPageRange(firstPageIndex, expectedTopN);
  await expect(page.getByTestId("rankings-pagination-summary")).toContainText(
    new RegExp(
      `${reveal.visibleFromRank}\\s*[–-]\\s*${firstPageRange.endRank}\\s+of\\s+${expectedTopN}`,
    ),
  );
  await expect(page.getByTestId("rankings-pagination-page")).toHaveText(
    `1 / ${getAvailableRankingPageCount(reveal.visibleFromRank, expectedTopN)}`,
  );
}

async function firstOrgHrefForDivision(page: Page, division: Division): Promise<string> {
  await page.goto(releasePath("/"));
  await selectDivision(page, division);

  const entries = await visibleRankingEntries(page);
  const firstLink = entries.first().getByTestId("ranking-org-link");
  await expect(firstLink).toBeVisible();
  await expect(firstLink).toHaveAttribute("href", /\/org\/[^#?]+/);

  const href = await firstLink.getAttribute("href");
  expect(href, `first ${division} org href`).toBeTruthy();
  return href as string;
}

async function findRankingEntry(page: Page, name: string) {
  for (;;) {
    const entry = page
      .locator('[data-testid="ranking-entry"]:visible, tbody tr:visible')
      .filter({ hasText: name });
    if ((await entry.count()) > 0) return entry.first();

    const nextPage = page.getByRole("button", { name: "Next rankings page" });
    if (await nextPage.isDisabled()) {
      throw new Error(`Could not find revealed ranking entry "${name}".`);
    }
    await nextPage.click();
  }
}

async function expectSelectedQuarter(page: Page) {
  if (!expectedQuarterLabel) return;

  const quarterSelector = page.getByLabel("Quarter");
  if ((await quarterSelector.count()) > 0) {
    await expect(quarterSelector).toBeVisible();
    if (releaseQuarterId) {
      await expect(quarterSelector).toHaveValue(releaseQuarterId);
    }
    await expect
      .poll(async () =>
        quarterSelector.evaluate((select) =>
          select instanceof HTMLSelectElement
            ? select.selectedOptions[0]?.textContent?.trim()
            : select.textContent?.trim(),
        ),
      )
      .toBe(expectedQuarterLabel);
    return;
  }

  await expect(page.getByText(expectedQuarterLabel).first()).toBeVisible();
}

async function expectRenderedChart(page: Page) {
  const chart = page.getByTestId("growth-chart");
  await expect(chart).toBeVisible();
  await expect(page.getByTestId("growth-chart-empty")).toHaveCount(0);

  const toggles = chart.locator('[data-testid^="growth-chart-toggle-"]:visible');
  const toggleCount = await toggles.count();
  expect(toggleCount, "visible chart metric toggles").toBeGreaterThan(0);

  for (let index = 0; index < toggleCount; index += 1) {
    const toggle = toggles.nth(index);
    const label = (await toggle.textContent())?.trim() || `toggle ${index}`;
    await toggle.click();

    await expect(chart.locator("svg.recharts-surface")).toBeVisible();

    const pointCount = await chart.evaluate((element) =>
      Number(element.getAttribute("data-active-point-count") ?? "0"),
    );
    expect(pointCount, `${label} point count`).toBeGreaterThanOrEqual(2);

    const curve = chart.locator(".recharts-area-curve").first();
    await expect(curve).toBeVisible();
    const pathData = await curve.getAttribute("d");
    expect(pathData?.trim().length ?? 0, `${label} SVG path length`).toBeGreaterThan(20);

    const box = await chart.locator("svg.recharts-surface").boundingBox();
    expect(box?.width ?? 0, `${label} SVG width`).toBeGreaterThan(240);
    expect(box?.height ?? 0, `${label} SVG height`).toBeGreaterThan(280);

    const monthLabels = await chart
      .getByTestId("growth-chart-month-tick")
      .allTextContents();
    expect(monthLabels.length, `${label} month tick count`).toBeGreaterThan(0);
    expect(
      new Set(monthLabels).size,
      `${label} month labels should be unique`,
    ).toBe(monthLabels.length);
  }
}

test.describe("published quarter release surface", () => {
  test("renders both ranking divisions with complete first pages", async ({ page }) => {
    await page.goto(releasePath("/"));
    await expect(
      page.getByRole("heading", { name: /Top Fastest-Growing Open Source Organizations/i }),
    ).toBeVisible();

    await expectSelectedQuarter(page);

    for (const division of ["emerging", "scaling"] as Division[]) {
      await selectDivision(page, division);
      const entries = await visibleRankingEntries(page);
      const firstEntry = entries.first();

      await expect(firstEntry.getByTestId("ranking-org-link")).toBeVisible();
      await expect(page.getByText(/Stars/i).first()).toBeVisible();
      await expect(page.getByText(/Contributors/i).first()).toBeVisible();
      await expect(page.getByText(/Downloads/i).first()).toBeVisible();
    }
  });

  test("keeps pagination aligned to the final 25-rank pages during reveal", async ({ page }) => {
    await page.goto(releasePath("/"));

    const reveal = await expectedRevealForPage(page);
    const firstPageIndex = getRankingPageIndex(reveal.visibleFromRank);
    const firstPageRange = getRankingPageRange(firstPageIndex, expectedTopN);
    const ranks = await visibleRankingEntries(page).then((entries) =>
      entries.evaluateAll((elements) =>
        elements.map((element) =>
          Number(element.getAttribute("data-ranking-rank")),
        ),
      ),
    );

    expect(ranks).toEqual(
      Array.from(
        { length: firstPageRange.endRank - reveal.visibleFromRank + 1 },
        (_, index) => reveal.visibleFromRank + index,
      ),
    );
    await expect(page.getByTestId("rankings-pagination-summary")).toContainText(
      `${reveal.visibleFromRank}–${firstPageRange.endRank} of ${expectedTopN}`,
    );
    await expect(page.getByTestId("rankings-pagination-page")).toHaveText(
      `1 / ${getAvailableRankingPageCount(reveal.visibleFromRank, expectedTopN)}`,
    );
  });

  test("shows the scheduled teaser stack without exposing organization data", async ({ page }) => {
    await page.goto(releasePath("/"));

    const expectedReveal = await expectedRevealForPage(page);
    const visibleTeasers = page.locator('[data-testid="ranking-teaser"]:visible');
    await expect(visibleTeasers).toHaveCount(expectedReveal.teaserRanks.length);

    if (expectedReveal.teaserRanks.length > 0) {
      const revealStatus = page.getByTestId("ranking-reveal-status");
      await expect(revealStatus).toBeVisible();
      await expect(visibleTeasers.first().getByTestId("ranking-org-link")).toHaveCount(0);
      const podiumColors = [
        "rgb(244, 196, 48)",
        "rgb(192, 192, 192)",
        "rgb(205, 127, 50)",
      ];
      for (let index = 0; index < expectedReveal.teaserRanks.length; index += 1) {
        await expect(visibleTeasers.nth(index)).toHaveCSS(
          "border-left-color",
          podiumColors[index],
        );
      }
    } else {
      await expect(page.getByTestId("ranking-reveal-status")).toHaveCount(0);
    }
  });

  test("keeps unrevealed organizations out of leaderboard search", async ({ page }) => {
    await page.goto("/?quarter=Q2_2026");

    const reveal = await expectedRevealForPage(page);
    test.skip(
      reveal.visibleFromRank <= 3,
      "Mnemosyne OSS is already revealed at this point in the campaign.",
    );

    await page
      .getByRole("combobox", { name: "Search organizations or repositories" })
      .fill("Mnemosyne OSS");
    await expect(page.getByText(/No matches for/)).toBeVisible();
    await expect(
      page.locator("#home-search-listbox").getByRole("option"),
    ).toHaveCount(0);
  });

  test("preserves an explicitly selected historical quarter in home navigation", async ({ page }) => {
    await page.goto("/?quarter=Q1_2026");

    await expect(page.getByTestId("site-home-link")).toHaveAttribute(
      "href",
      "/?quarter=Q1_2026",
    );
  });

  test("renders non-empty org detail charts for the top org in each division", async ({ page }) => {
    for (const division of ["emerging", "scaling"] as Division[]) {
      const href = await firstOrgHrefForDivision(page, division);
      await page.goto(href);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("signal-breakdown-section")).toBeVisible();
      await expect(page.getByTestId("growth-chart-section")).toBeVisible();
      await expect(page.getByTestId("repositories-section")).toBeVisible();
      await expectRenderedChart(page);
    }
  });

  test("uses methodology multipliers on the leaderboard", async ({ page }) => {
    await page.goto("/?quarter=Q2_2026");

    const polytoriaEntry = await findRankingEntry(page, "Polytoria");
    await expect(polytoriaEntry).toBeVisible();
    await expect(polytoriaEntry).toContainText("2.6×");
    await expect(polytoriaEntry).not.toContainText("130×");
  });

  test("displays padded ranking growth and explains the observed chart values", async ({ page }) => {
    await page.goto("/org/phase-rs?quarter=Q2_2026");

    const stars = page.getByTestId("signal-card-github_stars");
    await expect(stars).toBeVisible();
    await expect(stars).toContainText("1.76×");
    await expect(stars).toContainText(/Ranking baseline:\s*100\s*→\s*176/);
    await expect(stars).toContainText(/Chart:\s*2\s*→\s*176\s*\(88× actual\)/);
    await expect(stars).not.toContainText("+175.0×");
  });

  test("keeps chart boundaries while displaying the methodology multiplier", async ({ page }) => {
    await page.goto("/org/withcoral?quarter=Q2_2026");

    const coralContributors = page.getByTestId("signal-card-github_contributors");
    await expect(coralContributors).toBeVisible();
    await expect(coralContributors).toContainText("63");
    await expect(coralContributors).toContainText("7.88×");

    await page.goto("/org/mnemosyne-oss?quarter=Q2_2026");

    const mnemosyneStars = page.getByTestId("signal-card-github_stars");
    await expect(mnemosyneStars).toBeVisible();
    await expect(mnemosyneStars).toContainText("14×");
    await expect(mnemosyneStars).toContainText(/Ranking baseline:\s*100\s*→\s*1\.4K/);
    await expect(mnemosyneStars).toContainText(/Chart:\s*4\s*→\s*1\.4K\s*\(351× actual\)/);
  });

  test("renders each quarter month once on growth charts", async ({ page }) => {
    await page.goto("/org/withcoral?quarter=Q2_2026");

    const monthTicks = page
      .getByTestId("growth-chart")
      .getByTestId("growth-chart-month-tick");
    await expect(monthTicks.first()).toBeVisible();
    const monthLabels = await monthTicks.allTextContents();
    expect(monthLabels).toEqual(["Apr", "May", "Jun"]);
  });
});
