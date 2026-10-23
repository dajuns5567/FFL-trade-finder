# Every completed week: Fleeced! Inquirer editorial acceptance

This is an enforceable **continuing contract**, not a one-time Week 5 fix. Approved Week 4 V31 revision14 is immutable and the voice/format reference. Never substitute Week 1/2 editorial templates or copy that article text into a new week.

## Non-negotiable newspaper
- Exactly **32 unique rosters**, each assigned once; four permanent beat writers with **8 columns each**, rotating deterministically across weeks
- All eight *reporting desks*: result lede, player reporting with fantasy **and NFL stat evidence**, management, Hot Seat, Cool Throne, value (empty when no reliable value evidence), fan sentiment, and outlook
- The lede opens and outlook closes; middle order must vary by story, not 32 cloned templates; eight desk headings and section/flat-paragraph mirror must remain intact
- Typically 300–650 words, with genuinely different angles, relevant opponent, scorer, lineup decisions, stakes and season history; no fabricated injury, transaction, projection, score, team ranking or IDP fact
- Four reporter desks in league recap, with six distinct beats in order and substantial outlook and league beats; distinct division-board entries
- No original 2026 Week 3/4 archive can be overwritten, relabeled, re-generated or downgraded

## The humor is not optional
**Nick Swindell (Old Desk)**: tight sentences, deadpan dread, unenthusiastic praise, old scars; sports fan first. **Bartholomew Roycington III (Velvet Rope)**: elaborate literary/class-conscious mockery and flowing theatrical sentences. **Tilly Fleecer (Back Page)**: tabloid energy, irreverence, short zingers and outrage. **Jefferson Filch (Inquiry Desk)**: forensic noir, management receipts, running grudges and consequences. Every joke must respond to documented Week N facts. Avoid rote “congratulations,” hollow stats dumps, repetitive identical punch lines, interchangeable metaphors, and invented caricature masquerading as data.

**Reviewers must read at least one full story per reporter and all unique outliers; automated regexes cannot certify “funny” or “sarcastic.”** The private audit now returns voice-review questions and separately identified soft warnings. Editorial humor judgment remains explicitly required even when all structural checks are green.

## Automatic checks on every newsroom run
- The pre-existing V31 generator quality gate: same-team copy-forward, 32-team recurring normalized sentence/clause scaffolds, cross-reporter phrases, repeated fan jokes, recycled recap arguments, stale week records, grammar, stat and factual support
- The independent publication admission gate: desk order and layout, reporter selection, 32 team coverage, wrong-week/stale outlook, duplicated lineup cases, generated copy digest and history continuity
- The added `auditInquirerLanguage` in BOTH gates: 13-word windows reused in **five or more teams**; identical titles; common 9-word article openings; within-article repeated paragraphs; two or more verbatim copied previous-week paragraphs; and obviously robotic meta-copy. Subjective sarcasm signals generate human-review warnings, not automatic prose generation or false creative approval
- CI tests with deliberate duplicate prose, prior-week copy, article formatting regressions, manager badge mistakes, stale IDP/player award cache, and incomplete Manager Spotlight

## Publication flow (still protected until human/copy approval)
1. Every two hours, production scheduler checks Sleeper NFL clock, original 2026 historical archives, publisher enable flag and secure queue key. No blind publish of an unfinished matchup
2. Background generation walks **sequentially** over earliest missing editions and calls `completedPublicationWeek()`: finalized Sleeper matchups AND roster scoring must be available
3. Search approved deterministic variation salts. Apply generator **and** independent publication admission; fail closed with an editorial hold when all candidates fail. Never overwrite a locked prior edition
4. For a released locked edition, regenerate only missing/stale awards from that exact source: offense and IDP Players of Week, four manager badges when eligible, provenance v2, and current Manager Spotlight cache. Do not call the publication completed without features
5. The reader reuses the immutable published article and reporter archives thereafter. Every successive week compares to the immediately previous edition, including Week 5 to Week 6, not just Week 2 or Week 4

## Known release constraints (October 23, 2026)
The user's protected deploy-preview-402 generated Week 5 draft has passed its **structural** audit, but the source manuscript was not exported to an authenticated review process. The version on preview-402 is deploy-local; updating PR #402 would reset it. This branch is PR #404, which tests safeguards separately.

The existing production scheduler **would generate fresh prose instead of promoting that exact private manuscript**. No auto cutover until the exact reviewed manuscript is independently captured, approved, and safely transferred. Netlify's publisher flag is disabled and queue key absent. GitHub Actions' Playwright runner has no authenticated browser login. These facts mean weekly automatic *publication* is NOT currently activated, despite the scheduler code and automated quality checks. Do not pretend otherwise.

No paid TinyFish/Work, account purchases or upgrades. Never weaken Netlify team SSO to speed up testing.
