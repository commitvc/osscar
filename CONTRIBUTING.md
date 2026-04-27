# Contributing to the OSS Growth Index (OSSCAR)

Thank you for your interest in contributing to the OSS Growth Index! This project is maintained by [Supabase](https://supabase.com) and [>commit](https://commit.fund). We welcome contributions and feedback, but final decisions on methodology, data sources, and branding are made by the core team.

## What's welcome

- **Bug reports** — something broken in the frontend? Open an issue.
- **Data quality issues** — spotted incorrect data for an organization? Let us know.
- **Frontend improvements** — UI fixes, accessibility improvements, performance optimizations.
- **Documentation** — typo fixes, clarifications, additional examples.
- **Methodology discussions** — ideas for improving the ranking methodology (see below).

## What the core team decides

- Ranking algorithm design and signal selection
- Data sources and collection methods
- Publishing schedule and quarterly release process
- Branding, visual design, and co-branding guidelines

## Proposing methodology changes

The ranking methodology affects thousands of organizations. To ensure productive discussions:

1. **Start with a Discussion**, not a PR. Open a thread in the [Methodology](../../discussions/categories/methodology) category.
2. **Explain the change** — which signal, what normalization, why.
3. **Show the impact** — ideally with data showing how the top rankings would shift.
4. **Wait for alignment** — the core team will respond and, if the idea has merit, create an Issue for implementation.

This process saves everyone's time: you won't spend hours coding a change that gets rejected on principle, and the team can evaluate ideas efficiently.

For frontend bugs, documentation fixes, and data quality reports, skip the discussion and go straight to an Issue or PR.

## Development setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at http://localhost:3000. Data is loaded from CSV files in `frontend/data/`.

### Methodology

```bash
cd methodology
pip install -r requirements.txt

# Run tests
python -m pytest

# Reproduce rankings (requires base data from a GitHub Release)
python compute_index.py --input <base_data.csv> --output-dir results/
```

## Pull request guidelines

1. Fork the repo and create a branch from `main`.
2. If you've added code, add or update tests where appropriate.
3. Make sure `npm run build` passes for frontend changes.
4. Make sure `python -m pytest` passes for methodology changes.
5. If your change affects the methodology, update both:
   - `methodology/compute_index.py`
   - `frontend/src/app/methodology/page.tsx`
6. Write a clear PR description explaining what changed and why.

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.
