# Fleeced! Inquirer: forward-week editorial-generation contract

This contract applies to **every** future completed week, not just Week 5.
The eight named beats are newspaper coverage requirements; they are *not*
eight mandatory paragraphs in a fixed order. Section and paragraph selection
must respond to each team’s result, lineup, roster history, manager choices,
fan sentiment, opponent and postseason stakes. The locked Week 4 edition is
an archive and reading reference, never a mutable source draft.

## One factual premise, one primary home

| Premise | Primary editorial home | Avoid |
| --- | --- | --- |
| Final score and result | Lead, once | Reprinting margin and result in three lead paragraphs |
| Previous results, streak, trajectory | Lead interpretation | First-/second-Sunday language in Week 5+ |
| Fantasy and real-life football production | Player desk | The same “Against X, Y led…” sentence for all 32 teams |
| Legal bench/start decision | Management | Repeating one player pair and points gap in three paragraphs |
| Player struggling or declining | Hot Seat | Another copy of the management bench comparison |
| Positive impact and sustained form | Cool Throne | Generic praise; another copy of the stat row |
| Verified roster-value movement | Value desk | Filler market prose when no defensible signal exists |
| Fan feeling about management | Sentiment | A duplicate result summary dressed up as fan reaction |
| Future opponent, injury/bye, stakes | Outlook | Introducing the next opponent three separate times |

The draft can temporarily contain more reporting than the final column. The
last composition pass **selects and moves** story material before acceptance:
no five-paragraph legacy lead, no duplicate bench argument, no mandatory
three-scorer praise, no synthetic transactions, no fictional injury or score.
It uses real NFL stat fields to write the leading player’s football evidence
in sentences; fantasy points alone must not become a repeated statistic dump.
One lineup decision may appear only once even when an older template embeds
the same starter, reserve and gap in consecutive sentences of one paragraph.
Transaction syntax must use grammatical verbs, and generic roster-churn
conclusions may not replace distinct reported consequences.

## Format and voice

- All eight kinds remain accounted for; genuinely unavailable Value Watch
  evidence stays an empty, non-rendered section rather than padded prose.
- The lead starts each article, the outlook ends it, and the other desks move
  according to the team and reporter. One identical order for 32 articles is
  not acceptable. This preserves the *Week 4 reading hierarchy* while honoring
  the active V26 prohibition on a shared article template.
- The four permanent reporters retain distinct sentence rhythm, metaphor,
  skepticism, fandom, sarcasm and management attitudes. A bank of interchangeable
  one-liners is not a substitute for a story angle grounded in that team’s week.
- Preserve headings, byline, archive selections and links in the canonical
  League Hub reader. The `paragraphs` flat mirror must match section contents.
- Division-board hot takes must display an introduction and eight individually
  separated AFC/NFC division entries, even when a source draft delivers them
  as one unbroken paragraph. The browser-rendered layout is part of the audit.
- Reject inherited Week-2 first-two-games narration and anonymous, repeated
  second-scorer punchlines in Week 5+ rather than merely swapping week digits.
- The recap needs all four reporter desks and six named news beats in its first
  desk; its final league and outlook beats need multiple substantive paragraphs.

## Fail closed at both gates

The generation quality gate and independent publication admission **both**
import `inquirer-narrative-architecture.mjs` and `inquirer-format-contract.mjs`.
They inspect the final, rendered-order narrative after late copy-pruning;
recap hot takes must undergo freshness checks independently from the main
recap sections, since an old division-board monologue can hide there.
No human approval or previously good prose audit can bypass an article-layout,
semantic repetition or factual-integrity failure. A failing private preview
must report error, not completed; it must never be published by accident.

Regression entrypoints:

```
node --test tests/inquirer-narrative-architecture.test.mjs tests/inquirer-publication-guard.test.mjs
node scripts/inquirer-forward-v31-smoke.mjs
```

The season smoke exercises Weeks 5, 6, 9 and 14. CI runs those checks on
generation, guard and renderer changes. Preview-only drafts use deploy-local
storage; site protection can require an authenticated reviewer to start the
preview background job. The production scheduler is separate and runs only on
published production deploys after the authoritative week-completion checks.
