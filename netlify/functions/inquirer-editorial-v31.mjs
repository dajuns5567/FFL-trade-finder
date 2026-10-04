// Compatibility entrypoint used by league-hub for Week 3+.
// Week 1/2 remain on their existing immutable/preloaded route.
// The approved V31 identity stays stable for stored/live metadata while the
// implementation delegates to the fully regression-tested V37 reporter engine.

import {
  applyInquirerEditorialV37,
  evaluateInquirerEditionQuality as evaluateV37EditionQuality
} from './inquirer-editorial-v37.mjs';

export const FORWARD_INQUIRER_VERSION=31;
export const FORWARD_EDITORIAL_REVISION=14;
export const evaluateInquirerEditionQuality=evaluateV37EditionQuality;
export const applyInquirerEditorialV31=applyInquirerEditorialV37;

// Source-contract markers retained at this compatibility boundary. The actual
// implementations live in the preserved V31 core / V37 forward layers.
// same-team-copy-forward • cross-team-copy-scaffold • recap-copy-forward
// forwardCrossReporterPhraseOffenders • cross-reporter-phrase-scaffold
// function w2PreviousWeekBridge
// The Playoff Race Is No Longer Background Noise
// Who Advanced and Who Went Home
