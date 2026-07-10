import { expect, test, type Page } from "@playwright/test";

const releaseQuarterId = process.env.OSSCAR_RELEASE_QUARTER_ID ?? null;
const expectedQuarterLabel = process.env.OSSCAR_RELEASE_QUARTER_LABEL ?? null;
const expectedTopN = Number(process.env.OSSCAR_FRONTEND_TOP_N ?? "100");
const pageSize = Math.min(25, expectedTopN);

type Division = "emerging" | "scaling";

function releasePath(path: string): string {
  if (!releaseQuarterId) return path;

  const url = new URL(path, "https://osscar.local");
  url.searchParams.set("quarter", releaseQuarterId);
  return `${url.pathname}${url.search}`;
}

async function visibleRankingEntries(page: Page) {
  const entries = page.locator('[data-testid="ranking-entry"]:visible');
  await expect(entries.first()).toBeVisible();
  await expect(entries).toHaveCount(pageSize);
  return entries;
}

async function selectDivision(page: Page, division: Division) {
  await page.getByTestId(`division-tab-${division}`).click();
  await expect(page.getByTestId("rankings-pagination-summary")).toContainText(
    new RegExp(`1\\s*[–-]\\s*${pageSize}\\s+of\\s+${expectedTopN}`),
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

  test("distinguishes actual growth from padded ranking growth", async ({ page }) => {
    await page.goto("/org/phase-rs?quarter=Q2_2026");

    const stars = page.getByTestId("signal-card-github_stars");
    await expect(stars).toBeVisible();
    await expect(stars).toContainText("176×");
    await expect(stars).toContainText(/Actual:\s*1\s*→\s*176/);
    await expect(stars).toContainText(/Ranking:\s*100\s*→\s*176\s*\(1\.76×\)/);
    await expect(stars).not.toContainText("+175.0×");
  });
});
