// Compatibility entrypoint used by league-hub for Week 3+.
// Week 1/2 remain on their existing immutable/preloaded route.
export {
  applyInquirerEditorialV37 as applyInquirerEditorialV31,
  evaluateInquirerEditionQuality,
  FORWARD_INQUIRER_VERSION,
  FORWARD_EDITORIAL_REVISION
} from './inquirer-editorial-v37.mjs';
