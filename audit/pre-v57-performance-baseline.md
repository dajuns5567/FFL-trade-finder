# Pre-V57 Performance Test Baseline

Canonical code baseline: `b6efde4e7217d914fcf95e62476d602638ed34d3` (V56).

This branch preserves the exact pre-performance-test code state. The player values below were transcribed from the user-provided screenshots on 2026-08-14 and are intended only as regression checks after the performance optimization. No valuation targets are implied.

## Offense sample

| Overall | Player | Pos | CV | TV | Value | PPG | Seasons | Confidence | Scoring component |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Josh Allen | QB | 2496 | 2069 | 10345 | 22.4 | 3 | 100% | 1787 |
| 2 | Drake Maye | QB | 1961 | 1817 | 9085 | 17.8 | 2 | 74% | 1606 |
| 3 | Ja'Marr Chase | WR | 1861 | 1751 | 8755 | 19.8 | 3 | 100% | 1489 |
| 4 | Bijan Robinson | RB | 1847 | 1750 | 8750 | 20.6 | 3 | 100% | 1538 |
| 5 | Jahmyr Gibbs | RB | 1681 | 1646 | 8230 | 21.0 | 3 | 100% | 1538 |
| 6 | Lamar Jackson | QB | 1601 | 1634 | 8170 | 20.0 | 3 | 100% | 1724 |
| 7 | Jaxon Smith-Njigba | WR | 1662 | 1612 | 8060 | 18.1 | 3 | 100% | 1481 |
| 24 | Brock Purdy | QB | 994 | 989 | 4945 | 19.9 | 3 | 100% | 1688 |
| 25 | Malik Nabers | WR | 1180 | 987 | 4935 | 8.3 | 2 | 74% | 1086 |
| 26 | Trevor Lawrence | QB | 1073 | 971 | 4855 | 17.1 | 3 | 100% | 1352 |
| 27 | Omarion Hampton | RB | 1097 | 950 | 4750 | 8.5 | 1 | 42% | 1080 |
| 28 | Trey McBride | TE | 1069 | 939 | 4695 | 16.9 | 3 | 100% | 1294 |
| 29 | James Cook | RB | 1023 | 937 | 4685 | 17.0 | 3 | 100% | 1453 |
| 31 | Bo Nix | QB | 985 | 899 | 4495 | 18.8 | 2 | 74% | 1395 |
| 50 | Carnell Tate | WR | 898 | 760 | 3800 | — | 0 | — | — |
| 51 | A.J. Brown | WR | 823 | 748 | 3740 | 15.0 | 3 | 100% | 1424 |
| 52 | DeVonta Smith | WR | 833 | 747 | 3735 | 13.2 | 3 | 100% | 1377 |
| 53 | Tee Higgins | WR | 809 | 744 | 3720 | 15.2 | 3 | 100% | 1443 |
| 54 | Garrett Wilson | WR | 893 | 732 | 3660 | 9.7 | 3 | 100% | 1121 |
| 55 | Ladd McConkey | WR | 876 | 730 | 3650 | 12.1 | 2 | 74% | 1161 |
| 57 | Kyren Williams | RB | 793 | 715 | 3575 | 16.0 | 3 | 100% | 1387 |
| 58 | Fernando Mendoza | QB | 857 | 715 | 3575 | — | 0 | — | — |
| 176 | Jonah Coleman | RB | 615 | 464 | 2320 | — | 0 | — | — |
| 177 | Alvin Kamara | RB | 550 | 463 | 2315 | 12.6 | 3 | 100% | 1276 |
| 178 | Aaron Jones | RB | 566 | 463 | 2315 | 9.9 | 3 | 100% | 1047 |
| 179 | Isaiah Likely | TE | 653 | 462 | 2310 | 5.6 | 3 | 100% | 812 |
| 181 | Jerry Jeudy | WR | 561 | 460 | 2300 | 9.4 | 3 | 100% | 1113 |
| 183 | Oronde Gadsden | TE | 654 | 458 | 2290 | 8.8 | 1 | 42% | 759 |
| 184 | Kyle Monangai | RB | 643 | 458 | 2290 | 8.6 | 1 | 42% | 725 |
| 185 | J.K. Dobbins | RB | 618 | 458 | 2290 | 8.3 | 2 | 74% | 830 |

## IDP sample

| Overall | Player | CV | TV | Value | PPG | Seasons | Confidence | Scoring component |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 30 | Will Anderson | 860 | 906 | 4530 | 15.4 | 3 | 100% | 488 |
| 48 | Jack Campbell | 843 | 766 | 3830 | 12.3 | 3 | 100% | 458 |
| 56 | Maxx Crosby | 591 | 722 | 3610 | 18.5 | 3 | 100% | 506 |
| 64 | Zack Baun | 556 | 674 | 3370 | 13.3 | 3 | 100% | 472 |
| 71 | Myles Garrett | 493 | 653 | 3265 | 20.2 | 3 | 100% | 516 |
| 87 | Brian Burns | 424 | 605 | 3025 | 17.9 | 3 | 100% | 502 |
| 89 | Devin Lloyd | 448 | 602 | 3010 | 13.0 | 3 | 100% | 469 |
| 90 | Nik Bonitto | 433 | 597 | 2985 | 14.7 | 3 | 100% | 484 |
| 143 | Kyle Hamilton | 421 | 511 | 2555 | 12.4 | 3 | 100% | 460 |
| 149 | Brian Branch | 217 | 501 | 2505 | 15.1 | 3 | 100% | 487 |
| 155 | Nick Bolton | 382 | 487 | 2435 | 12.7 | 3 | 100% | 464 |
| 159 | Blake Cashman | 378 | 482 | 2410 | 12.8 | 3 | 100% | 467 |
| 161 | Zach Allen | 204 | 480 | 2400 | 13.4 | 3 | 100% | 473 |
| 165 | Chase Young | 174 | 477 | 2385 | 14.6 | 3 | 100% | 483 |
| 168 | Nate Landman | 363 | 474 | 2370 | 11.3 | 3 | 100% | 440 |
| 212 | Alontae Taylor | 247 | 437 | 2185 | 12.2 | 3 | 100% | 455 |
| 213 | Julian Love | 249 | 436 | 2180 | 12.3 | 3 | 100% | 454 |
| 215 | Terrel Bernard | 286 | 432 | 2160 | 11.1 | 3 | 100% | 435 |
| 219 | Quincy Williams | 212 | 425 | 2125 | 12.8 | 3 | 100% | 466 |
| 222 | Azeez Al-Shaair | 231 | 423 | 2115 | 11.4 | 3 | 100% | 441 |
| 224 | Kam Curl | 269 | 422 | 2110 | 10.3 | 3 | 100% | 422 |
| 227 | Zaire Franklin | 204 | 419 | 2095 | 12.5 | 3 | 100% | 461 |
| 228 | Jalen Carter | 245 | 417 | 2085 | 11.1 | 3 | 100% | 435 |
| 419 | Nick Emmanwori | 352 | 305 | 1525 | 13.7 | 1 | 48% | 391 |
| 420 | Dallas Turner | 278 | 305 | 1525 | 9.2 | 2 | 82% | 384 |
| 421 | Brandon Stephens | 174 | 305 | 1525 | 8.5 | 3 | 100% | 383 |
| 422 | Montaric Brown | 174 | 305 | 1525 | 8.2 | 3 | 100% | 376 |
| 423 | Antonio Johnson | 174 | 305 | 1525 | 8.3 | 3 | 100% | 377 |
| 427 | A.J. Terrell | 157 | 304 | 1520 | 8.7 | 3 | 100% | 387 |
| 428 | Deommodore Lenoir | 166 | 304 | 1520 | 8.4 | 3 | 100% | 381 |
| 429 | Emmanuel Forbes | 162 | 304 | 1520 | 8.6 | 3 | 100% | 385 |

## Freeze constraints for the test

- Do not alter offensive or IDP valuation weights, thresholds, multipliers, scarcity logic, nonlinear value scaling, or age settings.
- Do not alter the Sleeper endpoints, season inputs, scoring rows, qualification rules, or merge semantics.
- Do not alter consensus sources, source extraction, source validation, source weighting, or refresh behavior.
- Test only computation/render efficiency. Any material value difference from this baseline is a regression and should trigger rollback to the preserved code state.
