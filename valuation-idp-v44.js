(()=>{
  /*
   * CONTROL AUDIT ONLY — PR #384
   *
   * V72 already applies the IDP-only overall trade-value curve. V73 then
   * applies a second IDP-only descending curve to V72's already-compressed
   * output. For this control, leave the V72 result untouched so we can test
   * whether the stacked second compression is what breaks the offense/IDP
   * relationship in the combined master ranking.
   *
   * This intentionally changes no scoring logic, offense valuation,
   * 60/23/12/5 weights, canonical rank normalization, or downstream IDP
   * archetype refinements.
   */
  window.IDP_OVERALL_TRADE_CURVE_V73 = {
    version: 73,
    auditControl: true,
    disabled: true,
    description: 'PR #384 control: V73 second IDP-only compression disabled; V72 remains active.'
  };

  if (typeof masterRankCache !== 'undefined') masterRankCache = null;
  if (typeof valueCache !== 'undefined' && valueCache?.clear) valueCache.clear();
  if (typeof fitCache !== 'undefined' && fitCache?.clear) fitCache.clear();
  if (typeof stageCache !== 'undefined' && stageCache?.clear) stageCache.clear();
})();
