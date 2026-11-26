# Public release safety checklist

The public application is intended to be usable without accounts or passwords. A private link is not access control. Development previews and unpublished builds remain restricted.

## Release gates

- Preserve archived accepted Preview 656 and exact security-candidate lineage.
- Require all functional, valuation, scheduled publisher, historical record and browser checks to pass, including the restricted static publish directory.
- Verify native function rate limits in the deployed protected preview; a warm-instance limiter is supplemental only. Avoid load-testing production or consuming hosting credits unnecessarily.
- Check the actual deployed HTTPS site and security headers. Keep account protection in place until release acceptance.
- Verify the durable history, awards, importer and Inquirer branches, trusted scheduled producers and readback. Never overwrite or delete original archive records as part of release testing.
- Review repository secret findings and private fields without reproducing credentials. Rotate/revoke any confirmed exposed credential before release. The current repository is public; do not switch it private without replacing the public raw-data dependencies.
- Keep private diagnostics, source files for functions, development tests and workflows out of the static publish directory.
- Review third-party publisher terms and consent to display league usernames and team history to anyone able to reach the URL. Do not publish manager emails, phone numbers, tokens or private account information.

## Account-owner controls (require owner verification)

- GitHub, Netlify and associated email: unique credentials, passkeys/2FA and securely stored recovery codes.
- Review active sessions and authorized apps; revoke obsolete PATs, Netlify personal tokens, build hooks and unused integrations. Prefer minimal scopes and dedicated automation credentials. Never give visitors account credentials.
- Protect main from force pushes/deletion and require the relevant passing checks. Protect archive branch writers without preventing the established scheduled GitHub workflows. Do not enable a rule that breaks trusted data publication.
- In GitHub Security settings verify dependency alerts and available secret scanning/push protection. Keep default workflow token permissions read-only; only the actual scheduled archive producers need contents: write.
- Check Netlify usage/billing alerts, spending controls and team membership. Keep forms disabled unless explicitly required.
- After an explicitly authorized final production deploy, retain SSO on non-production deployments if supported; remove visitor login only for production. Confirm old production/deploy aliases do not expose a less-protected build. Verify public read-only behavior without storing any test records.

This checklist is not a certification. Automated scans cannot establish that a personal account is safe, that every historical credential is absent, or that no attack is possible.
