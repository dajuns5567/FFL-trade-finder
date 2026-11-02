# Week 5+ editorial CI (replacement Netlify site)

The source of truth is **PR #402**. Nothing in this audit publishes, unlocks, changes historical Blobs, or merges the PR.

## Continuous, zero-browser-cost checks
`.github/workflows/inquirer-editorial-r5-smoke.yml` invokes `tests/inquirer-private-edition-audit.test.mjs` on every editorial PR change. It checks 32 distinct articles, eight sections, four reporters at eight apiece, prose lengths and repeats, a six-beat recap, and underlying editorial guard flags. Existing newsroom/finder regression CI still runs.

## Private deployed manuscript (SSO-protected)
Visit `https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-preview-diagnostic?audit=1&preview_week=5` while signed into the replacement Netlify team. This is **read-only** and uses only deploy-local private draft storage. It emits JSON with `ready`, `editorial.passed`, issues, reporter counts, word counts, and `status`.

The result `STRUCTURAL_PASS_HUMAN_REVIEW_REQUIRED` **is not publication approval**. Human prose/fact checking is mandatory. If the manuscript is still running or absent, the endpoint returns HTTP 409 and `ready:false`. It never starts generation.

## Optional browser check
`.github/workflows/inquirer-week5-playwright.yml` can be dispatched manually only. It requires an explicitly provisioned GitHub Actions secret `INQUIRER_PLAYWRIGHT_STORAGE_STATE` with valid authorized Netlify team browser state. If the secret is absent, the workflow declares **AUTH_REQUIRED** and does not attempt or assert a successful live browser test. Never put team cookies in source code, CI logs, screenshots, or artifacts. Netlify access protection stays enabled. Browser screenshots and audited JSON expire after two days. Session state may expire and must never be treated as permanent authentication.

No TinyFish usage is required. GitHub and Netlify allowances can still be metered by their respective providers; the user prohibited purchases or top-ups. Do not upgrade plans or run paid services without permission.

## What is still required to publish
1. Confirm the actual draft JSON's `audit=1` output passes and independently inspect all 32 articles for Week 4 editorial voice, factual accuracy, and variety.
2. Ensure full Week 5 weekly awards, offense/IDP Players of the Week, highest/lowest scoring manager badges, and Manager Spotlight are generated and verified.
3. Obtain final publication authorization, perform a controlled replacement-site production release, and verify both runtime content and safe automated future schedules.
4. The temporary one-time `inquirer-archive-restore` function has been removed from the PR branch after successful restoration. Do not reintroduce this sensitive one-time migration endpoint into permanent releases.

Do not confuse a green CI workflow with a real, approved Week 5 published newspaper.

## No-Work, no-TinyFish local authenticated browser path
The new `scripts/inquirer-week5-playwright-local.mjs` runs on the user's computer, using an interactive Chromium window. From a local clone of this branch run:
```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/inquirer-week5-playwright-local.mjs
```
Sign into Netlify in that browser, then press Enter in the terminal. The script reads the private Week 5 draft; if missing, it starts exactly one private Week 5 background generation, waits for status, runs `audit=1&preview_week=5`, and writes a JSON report and screenshot to the **local** `artifacts/inquirer-week5-local/` folder. It never publishes or exports cookies. Keep local artifacts private. Never commit them. A structural pass still requires a human article and awards review.
