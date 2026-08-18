(()=>{
'use strict';
/* V131: legacy Section1 V100 runtime intentionally retired.
   Search, evaluator, finder, rendering, value adjustment and selection state
   are owned by the active V130/V131 runtime. Keeping this shim prevents older
   site wrappers from reinstalling package-penalty, rank-tag, or evaluator handlers. */
function install(){window.__section1CoreRetired='v131';return true}
window.tradeSection1V100={install};
})();