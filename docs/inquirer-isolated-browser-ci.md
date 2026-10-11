# Isolated Inquirer browser CI

Use the dedicated Netlify project `fleeced-inquirer-browser-ci` with branch `player-signal-layer-r1`, publish directory `.`, and functions directory `netlify/functions`. Its browser smoke test must not be confused with production deployment or authorization to publish an Inquirer edition.

The site requires read-only preview restrictions and isolated storage. Keep the project private until its deployment, access controls, and function permissions are verified. CI must fail rather than silently skip unavailable hosted-browser verification.

When migrating Netlify accounts, update the CI project URL/connection rather than hardcoding a new site throughout the application.
