# Week 5 exact-copy release: operator-only procedure (NOT approval)

**Status: HOLD.** Full CI on PR #404 is passing, but production publication and importing from a private draft are distinct operations. PR #402 remains the authenticated draft and MUST NOT be rebuilt or overwritten.

## Identify the exact source
- Signed-in source: private PR #402 draft, 2026 Week 5, V31 revision39, 32 unique articles and full recap.
- Offline candidate: local `week5-revised-recap-candidate.json` outside Git (15 edited team articles plus recap). **Do not commit its sensitive full league data to this repository.**
- Run `node scripts/inquirer-week5-exact-copy-preflight.mjs <original-authenticated.json> <candidate.json>` and inspect its failures, editorial findings and editorial copy SHA-256.
- Candidate `preview_generation_quality.ok=false` and `preview_editorial_audit.ok=false` intentionally indicate human review HOLD. The preflight MUST NOT interpret them as approval.

## Independent no-write release contract
Before operator import, supply canonical historical Weeks 3 and 4, the real replacement Netlify site ID, **null** for the Week 5 target (proof that the canonical slot is vacant), the authenticated original digest, exact candidate digest, explicit human approval bound to the latter, and a complete associated-feature plan to `inspectWeek5ReleaseAuthorization` in `scripts/inquirer-week5-release-authorization.mjs`. It refuses a wrong team/site, any locked Week 5, a modified manuscript, missing feature work, or missing approval. Legacy 2026 Week 3/4 archives are verified by their canonical validator and may legitimately lack a `published_locked` property; **do not mutate the archive to supply it**. This is a pure dry-run check, not a Netlify write API, approval mechanism or certification that the import was executed.

## Minimum release architecture (not implemented or authorized yet)
1. A protected, production-only operator must separately provide a signed approval naming the **candidate** editorial digest, reviewer and timestamp; a public HTTP endpoint cannot mint approval.
2. Verify the approved site ID is **8776d155-bc7b-4dcd-bafc-3d70d3d51800**, site name `transcendent-manatee-2f0123`, and the original Week 3/4 archive fingerprints. Never import into original paused site `brilliant-faun-c5b649`.
3. The single-purpose import must verify no Week 5 locked edition exists, and refuse conflict or any partial earlier publication. It must **not** call `weeklyReport(req)` to regenerate text.
4. Strip preview-only status fields, preserve every reviewed article and recap byte-for-byte (field-level JSON canonical comparison), set final lock/provenance only as permitted by the existing canonical archive validator, then store in the exact canonical Week 5 Blob path.
5. Update article keys and reporter index from this *same edition*, and independently confirm recap and entire reporter archive read-back. No reporting "completed" before every feature store passes.
6. Generate weekly player awards (offense + IDP), applicable four management badges, complete 32-manager Spotlight cache **from the accepted archive**, not fresh regenerated prose. Run `hasCompleteWeekFeaturePackage` and `hasCompleteManagerSpotlightCache`.
7. Re-read Week 5 canonical archive and verify `editorialCopyDigest(lockedEdition) === approvedDigest`. Do not substitute a file-byte SHA for an editorial-copy digest; the latter intentionally excludes status metadata.
8. Only after every check succeeds can the publisher enable flag/queue be considered for subsequent completed weeks. Keep original Weeks 1-4 immutable and their archive identities verified.

## Read-only post-import verification
After an authorized external operator performs the write and associated feature updates, use `inspectWeek5Readback(store,approvedDigest)` from `scripts/inquirer-week5-readback-verification.mjs`. This reads and validates the canonical `broadcasts/2026/week-05.json`, broadcast index, **entire approved** recap, all 32 reporter archive articles and reporter indexes, weekly player/manager awards, and the current Manager Spotlight cache; it performs no repairs or writes and fails closed on any mismatch. Do not report a completed release until `ok=true` and the public reader is verified using the signed-in site.

## Unresolved release blockers
- The connected Netlify API does not provide safe Blob read/write or copy promotion for this deploy-local draft. Do not invent a working import connection.
- Manual approval of this exact edited manuscript has not been given. A CI green check does not meet that requirement.
- A production-only, restart-safe exact-copy promotion that updates secondary indices/awards is not currently proven end-to-end.
- Netlify team SSO must remain in place. Do not expose credentials or use paid browser services without authorization.

## Existing automatic weekly coverage
The current two-hour production polling schedule, Sleeper completion check, sequential prior-week archival gate, V31 candidate selection, independent editorial auditing, and immutable archive behavior already exist. They can function for future completed weeks once production is enabled, but **they do not currently substitute for exact-copy import of the reviewed Week 5 manuscript**.

**Do not run the production background publisher or set `FLEECED_ENABLE_NEW_SITE_PUBLISHER=true` merely because this checklist is present.**
