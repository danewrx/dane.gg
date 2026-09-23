# Browser tests

This directory contains Playwright end-to-end tests for the website. Unit tests live
alongside source files in `apps/frontend/src/` and `apps/backend/src/`.

## Contents

| File | Coverage |
| --- | --- |
| `homepage.spec.ts` | Homepage rendering |
| `navigation.spec.ts` | Site navigation |
| `pages.spec.ts` | Public pages |
| `seo.spec.ts` | Search metadata and related endpoints |
| `settings.spec.ts` | Visitor settings controls |
| `theme-switcher.spec.ts` | Public theme selection |
| `helpers.ts` | Shared navigation and settings-panel helpers |

## Running tests

Complete the [development setup](../README.md#development), including the database, first.
Install Playwright browsers from the repository root with `bunx playwright install`.
Run test commands from the repository root:

| Command | Purpose |
| --- | --- |
| `bun run test:e2e` | Run Chromium and Firefox tests |
| `bun run test:e2e:ui` | Open the interactive test runner |
| `bun run test:e2e:all` | Include WebKit |
| `bun run test:e2e:webkit` | Run only WebKit |

[playwright.config.ts](../playwright.config.ts) configures the tests to use
`http://localhost:5173`. Playwright starts `bun run dev` automatically and reuses an existing
development server outside CI. Failed tests produce screenshots; retries collect traces.
Generated reports and results belong in `playwright-report/` and `test-results/` at the
repository root.
