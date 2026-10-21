# AGENTS.md — Fleeced! Project-Only Access Policy

**Standing user instruction. Applies to every AI assistant, browser agent, TinyFish session, connector, script, and delegated task working on this repository.** Do not assume plugin installation or connection authorizes anything beyond the task-specific scope below.

## Allowed purpose

Access only what is **necessary to develop, diagnose, test, audit, and maintain Fleeced! League Hub / Fleeced! Inquirer** and its associated trade/value-history features. Minimize pages visited, data retrieved, and modifications.

## Authorized project boundaries

- GitHub: `dajuns5567/FFL-trade-finder`, its Fleeced!-related branches, PRs, workflows, artifacts, and issues.
- Netlify: Fleeced! projects `transcendent-manatee-2f0123` (replacement/Deploy Previews) and `brilliant-faun-c5b649` (historical Fleeced! deployment) **only when necessary** for this work.
- Fleeced! published sites, explicitly related Deploy Preview URLs, Netlify project-specific settings/logs, and associated Fleeced! data stores.
- Public NFL/fantasy-football data sources **only when directly needed** to verify Fleeced! facts or functionality.
- Authentication or redirects only as strictly necessary to access these approved project pages; do not inspect unrelated resources reached through an account-wide dashboard.

This is a **purpose and resource restriction**, not permission to survey the user's accounts. If an account page lists unrelated projects, ignore them. Never open, query, enumerate, summarize, export, or alter unrelated projects or personal data.

## Prohibitions

1. **No unrelated browsing or account access.** Do not navigate unrelated websites, repositories, dashboards, messages, files, services, or personal accounts, even when a connected browser profile could access them.
2. **No credential exploration.** Do not open or retrieve passwords, private keys, API tokens, session cookies, credential vaults, or secret values. Do not copy, print, save, or expose secrets. Treat accidental exposure as sensitive and avoid further access.
3. **No unauthorized changes.** Do not merge PRs, alter `main`, change production deployments/publication, delete or migrate data, change billing/access controls, or change account-level settings without the user's **specific, explicit authorization for that action**. Plugin connection alone is not approval.
4. **No unnecessary disclosure.** Do not send Fleeced! data to unrelated websites, third-party services, or external destinations. Only use a browser automation provider when the user has connected and authorized it, and keep activity limited to project work.
5. **No permission escalation.** Never silently widen scope, use different accounts, connect a vault, or install another integration.

## Required behavior

- Before each browser or external-tool operation, ask whether the exact page/resource and requested action are needed for Fleeced!. If not, **do not access it**.
- Prefer read-only observation and project-scoped endpoints. Keep unpublished Week 5/future manuscripts isolated until independently verified and explicitly approved for publication.
- When scope is uncertain, stop that **specific operation** and request the user's permission; continue other in-scope work where possible.
- Do not infer permission from a past session, from a broadly authenticated browser, or from a technically available API.
- Keep this policy effective for future weeks and future sessions until the user expressly changes it.
- Future agents should read this file **before** using TinyFish, other browsers, GitHub, Netlify, or any connected tool on Fleeced!.

## What this file does *not* do

This file is a persistent **repository instruction**, **not a technical sandbox, browser-domain firewall, or modification of TinyFish's OAuth/app permissions**. Enforce least privilege through the integration's actual settings if available; never claim this file technically prevents off-project access. The user must explicitly approve any expansion of this policy.

**Project work may continue on draft PR #402; do not merge or publish to production without explicit permission.**
