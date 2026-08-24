V252 retry notes

Baseline: revert commit 40eb80e81beea296fef77d3414fd1d1354386b41, whose tree is exactly V250.

Scope: Add assets if needed only, with manual outgoing selections.

Architecture: standalone post-search controller. Frozen normal Finder and Acquire Specific Player runtimes are not modified or transformed.

Behavior: primary manual package runs first unchanged. If fewer than 250 recommendations are produced and Add assets if needed is ON, the controller temporarily evaluates packages that retain every selected asset and add one or two owned assets (maximum outgoing package size 3), using the existing public Finder run/render methods. Exact duplicate cards are removed and only remaining capacity up to 250 is appended.

Blank searches, checkbox OFF, values, fairness, filters, pick ownership, MIDA, Evaluator, and existing frozen runtime files are unchanged.
