@AGENTS.md

## Project Context

**OSS Growth Index** is a co-branded quarterly website by **Supabase** and **>commit VC** (commit.fund) that ranks the top 200 fastest-growing open source GitHub organizations each quarter.

### Goals
- **>commit:** build reputation with OSS developers, surface potential investment deals
- **Supabase:** generate developer leads and awareness

### How the ranking works
Each quarter, growth is measured across multiple signals per GitHub organization:
- GitHub stars and contributors
- npm downloads
- PyPI downloads
- HuggingFace downloads and likes

Each signal produces a growth rate and a percentile rank. These are weighted and aggregated into a single composite score used for ranking.

### Two tiers
The index is split into two independent leaderboards:
- **Above 1,000 stars** — established orgs with meaningful baselines
- **Below 1,000 stars** — emerging orgs where relative growth is more meaningful

### Pages
1. **Home (`/`)** — ranked table for both tiers, with key metrics per org (rank, name, growth score, stars, country, etc.)
2. **Org detail (`/org/[slug]`)** — in-depth breakdown for a single organization: all signal metrics, growth rates, description, links

### Data
- Source during prototyping: CSV files in `/data/`, read server-side via `src/lib/data.ts`
- Future: Supabase (Postgres), updated quarterly
- Key fields per org: `company_name`, `logo_url`, `description`, `country`, `homepage_url`, `github_owner_url`, per-signal start/end values, growth rates, percentiles, and weights

### Context of use
Users land from social media, newsletters, or Supabase/commit blog posts. They are technically literate and opinionated — they judge quality instantly. The experience must reward both a **quick scan** (top 10, tier badges, growth numbers) and **deeper exploration** (methodology, org detail page).

## Design Context

### Users
The OSS Growth Index serves a mixed but intentional audience: **developers and open source maintainers** are the primary users, coming to benchmark project growth, discover fast-moving ecosystems, and validate technical choices. A secondary but equally important audience is **founders, investors, and VCs** — the collaboration between Supabase and >commit means this is also a signal for the startup/investment community scouting high-growth OSS organizations. The interface must read as credible and data-authoritative to both groups simultaneously.

### Brand Personality
**Bold, precise, developer-native.** Three words: **Confident. Technical. Kinetic.**

The emotional goal is the feeling you get from opening a well-designed developer dashboard that's also visually alive — dark, high-contrast, with numbers that feel important and ranked positions that carry weight. Founders and investors should feel the prestige of appearing on it. Developers should feel it was built for them.

### Aesthetic Direction
- **Dark mode primary.** Background near-black with high-contrast foreground.
- **Supabase-influenced base:** Clean layout, sharp typography, minimal chrome, purposeful green accents from the Supabase palette (`#3ECF8E`).
- **Layered with dev-tool energy:** Monospace type (Geist Mono) for numbers, rankings, and growth rates. Data-dense tables that don't feel cluttered.
- **Anti-references:** No generic SaaS dashboard aesthetics (soft shadows, rounded cards everywhere, pastel charts). No startup landing page energy. No excessive whitespace that undermines data density.

### Design Principles
1. **Data is the hero.** Every layout decision should make rankings, growth rates, and metrics easier to scan and compare.
2. **Developer credibility first.** Monospace for data, high contrast, precise spacing — precise because accuracy matters.
3. **Prestige through restraint.** A stark ranked list with great typography communicates more authority than an animated card carousel.
4. **Supabase DNA.** Dark backgrounds, green as the primary accent, clean sans-serif layout — this is a Supabase co-product.
5. **Dual-audience legibility.** Investors skim for signals (tier badges, rank deltas, org names). Developers dig into methodology. Support both reading modes: summary at a glance, depth on demand.
