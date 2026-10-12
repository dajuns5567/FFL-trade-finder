# Isolated Inquirer browser CI

Use the dedicated Netlify project `fleeced-inquirer-browser-ci` with branch `player-signal-layer-r1`, publish directory `.`, and functions directory `netlify/functions`. Its browser smoke test must not be confused with production deployment or authorization to publish an Inquirer edition.

The site requires read-only preview restrictions and isolated storage. Keep the project private until its deployment, access controls, and function permissions are verified. CI must fail rather than silently skip unavailable hosted-browser verification.

When migrating Netlify accounts, update the CI project URL/connection rather than hardcoding a new site throughout the application.

## SSO-protected browser acceptance

The hosted Playwright test accepts an optional GitHub Actions secret named `NETLIFY_CI_BROWSER_STORAGE_STATE`. It must contain valid Playwright `browserContext.storageState()` JSON for a **dedicated, least-privilege, short-lived test identity** authorized to view the PR preview. The runner loads the JSON into the browser context; it does not print its value. Never use an owner/admin's personal login session, put cookies in source, or publish session files as CI artifacts. Rotate/expire test identity sessions frequently. If the secret is absent, GitHub requests remain unauthenticated and may return HTTP 401 under SSO.

This support does **not** mint an SSO session. A site/team administrator must provision a dedicated test identity and securely install the secret in the repository Actions secrets. SSO cookie scope and Netlify challenge handling must be verified in an actual GitHub-run browser test; a successful Netlify deploy alone is insufficient. Do not disable SSO to make a status green. The mandatory read-only isolated-site assertions (bulk history export denied; on-load publishing denied; Week 5 not published) remain in place. The earlier `fleeced-inquirer-browser-ci` site in a disconnected Netlify account must be migrated or restored before hosted acceptance can complete.
