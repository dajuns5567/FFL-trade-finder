(()=>{
'use strict';
function install(){
  const tab=[...document.querySelectorAll('.tabs button')].find(b=>b.dataset?.tab==='settings');
  if(tab)tab.textContent='Methodology';
  const section=document.getElementById('settings');
  if(!section)return;
  section.innerHTML=`
    <div class="card">
      <h2>Methodology</h2>
      <p class="muted">Fleeced! uses one league-specific master valuation system across Player Values, Trade Finder and Trade Evaluator. The model starts with dynasty market consensus, then refines that baseline for this league's 32-team structure, Superflex format, scoring, positional economics and draft environment. Team need and Finder settings can influence which trades are recommended, but they never change an asset's underlying master value.</p>

      <h3>1. Master player value and ranking scale</h3>
      <p>Every player belongs to one master ordering used throughout the site. The highest-valued player anchors the scale at approximately <b>9,999</b>, with the broader player pool distributed down toward roughly <b>100</b>. The purpose of the wide 100–9,999 range is to preserve meaningful separation between elite, starter, depth and replacement-level assets instead of compressing very different players into nearly identical values.</p>
      <p>Overall rank and positional rank come from this same underlying ordering. A player displayed as WR1, QB5 or Overall 20 should therefore occupy that same relative position in the valuation system used by Finder and Evaluator. Displayed values may be rounded, but internal tie-breaking can retain finer information such as consensus, scoring and other valuation components, so two players showing the same rounded value are not necessarily treated as perfectly interchangeable.</p>

      <h3>2. Consensus value</h3>
      <p><b>Consensus is the primary market anchor.</b> The project has incorporated dynasty-market and expert inputs including FantasyPros, DraftSharks, KeepTradeCut (KTC), FanRanked and position-specific IDP sources such as The IDP Show, DraftSharks IDP and RotoWire IDP. Consensus was intentionally given substantial influence so league-specific adjustments refine realistic dynasty market value rather than overpowering it.</p>
      <p>Consensus is not simply a displayed rank copied into the site. It is one component of the master valuation process. When consensus sources refresh, legitimate market movement can change player values and ranks; presentation-only or Finder-only changes are not supposed to move those values.</p>

      <h3>3. League-specific value</h3>
      <p>This league contains <b>32 teams</b>, uses <b>Superflex</b>, includes IDP, starts <b>2 IDPs</b>, and has <b>no required tight-end starting slot</b>. Those structural facts materially change positional economics compared with a typical 10- or 12-team dynasty league.</p>
      <p>The established league-specific scarcity adjustments are:</p>
      <ul>
        <li><b>QB: 15%</b> — Superflex plus 32 teams creates substantial quarterback demand and emphasizes both floor and ceiling.</li>
        <li><b>RB: 15%</b> — usable dynasty running-back supply is limited enough to warrant a meaningful scarcity premium.</li>
        <li><b>WR: 10%</b> — wide receiver scarcity matters, but is intentionally lower than QB and RB.</li>
        <li><b>TE: 2%</b> — minimal scarcity because the league does not require a tight end in the starting lineup.</li>
        <li><b>IDP: 0%</b> — usable defensive depth is broadly available; only approximately the top <b>5–10 IDPs</b> should behave like truly premium defensive assets.</li>
      </ul>
      <p><b>Team fit contributes 0% to a player's master value.</b> A player does not become more valuable because New Orleans, or any other specific team, needs his position. Roster construction is reserved for partner selection, recommendation ordering and trade rationale.</p>

      <h3>4. League scoring component</h3>
      <p>Scoring is incorporated because identical real-world production can have different fantasy value under different league settings. This is especially important for quarterbacks in Superflex and for impact IDPs in this league's unusually strong big-play scoring environment.</p>
      <p>The established IDP scoring inputs include:</p>
      <ul>
        <li>IDP touchdown: <b>10 points</b></li>
        <li>Sack: <b>4.5</b></li>
        <li>QB hit: <b>2.5</b></li>
        <li>Tackle for loss: <b>2.5</b></li>
        <li>Interception: <b>9</b></li>
        <li>Pass defended: <b>6</b></li>
        <li>Forced fumble: <b>7.5</b></li>
        <li>Fumble recovery: <b>7.5</b></li>
        <li>Blocked punt / FG / PAT: <b>5</b></li>
        <li>Safety: <b>5</b></li>
        <li>Solo tackle: <b>1</b>; assisted tackle: <b>0.5</b></li>
        <li>INT return yards and fumble return yards: <b>0.1 per yard</b></li>
      </ul>
      <p><b>Combination scoring matters.</b> For example, a sack can also earn tackle-for-loss and QB-hit points, while an interception can also earn pass-defended points. The model therefore evaluates the scoring environment rather than treating every defensive statistic as an isolated event.</p>
      <p>Tight-end reception scoring is read from live Sleeper league settings. If there is <b>no TE-specific reception bonus</b>, the TE scoring adapter contributes no extra TE-premium adjustment. That preserves the existing valuation baseline while allowing an actual future TE reception bonus to be reflected without rewriting unrelated positions.</p>

      <h3>5. Draft-pick valuation</h3>
      <p>Draft picks are treated as real assets whose value depends on <b>year, round and projected slot/strength</b>. This league has <b>32 selections per round</b>, so pick labels cannot be interpreted using ordinary 12-team dynasty assumptions. For example, pick 1.32 is still technically a first-round pick, but it occupies a draft position that would fall deep into the third round of a 12-team draft. The model therefore compresses later pick value appropriately for the 32-team environment.</p>
      <p>The current project horizon extends through <b>2029</b> and should extend as Sleeper exposes additional future seasons. Ownership comes from Sleeper's current traded-pick data: the team that actually owns the pick is the team allowed to trade it. The original franchise attached to the pick does not override current ownership.</p>
      <p>Finder controls such as year or round filters can restrict eligible picks, but they contribute <b>0</b> additional valuation adjustment. Selecting “Acquire draft picks,” for example, changes what the Finder searches for; it does not make a 2nd-round pick worth more simply because the user requested one.</p>

      <h3>6. Raw package value</h3>
      <p>Each side of a trade begins with the sum of the master values of the assets being exchanged. This is the <b>raw package value</b>. Raw arithmetic is intentionally visible because it provides the clearest starting point for understanding a proposal.</p>
      <p>Raw addition, however, is not always equivalent to real trade buying power. A package of three replacement-level players whose displayed values happen to total 4,000 should not automatically be treated as economically identical to one premium 4,000-value player. That consolidation problem is handled only at the trade-evaluation layer, not by changing the standalone values of the players.</p>

      <h3>7. Value Adjustment</h3>
      <p><b>Value Adjustment is trade-only.</b> Its purpose is to model the premium required to acquire the more concentrated or desirable asset when raw addition understates that asset's practical trade cost. It may apply in an appropriate <b>1-for-1</b> trade or to the premium side of a multi-asset consolidation trade.</p>
      <p>The adjustment contributes <b>0</b> to the player's permanent master value and <b>0</b> to his permanent rank. It exists only inside the specific trade being evaluated. Finder and Evaluator use the same adjustment framework so a proposal is not judged under two different valuation systems.</p>

      <h3>8. Package Quality Penalty</h3>
      <p><b>Package Quality Penalty is also trade-only</b>, but solves the opposite problem. It reduces the effective buying power of a package when several very low-quality assets are stacked together to acquire a materially better asset. The penalty is designed to become more meaningful as the package contains more and/or deeper-ranked filler.</p>
      <p>It does <b>not</b> apply to a normal 1-for-1 trade and is not automatically triggered merely because a trade contains multiple players. Mid-tier and premium packages can retain their value. The established behavioral standard is that <b>3 players ranked in the 500s</b> should not readily purchase a clearly superior asset simply because their raw displayed values add up, while a player around overall <b>~800</b> should have package buying power closer to a modest future 3rd-round pick, subject to the model's continuous curve rather than a hard rank cutoff.</p>
      <p>A package receiving its own Package Quality Penalty should not simultaneously receive its own Value Adjustment. The opposite premium side may still receive Value Adjustment when independently warranted. When a package penalty applies, Finder and Evaluator can show the raw total, penalty, after-penalty value and trade-adjusted total so the user can see how the effective value was reached.</p>

      <h3>9. Fairness score and recommendation thresholds</h3>
      <p>Fairness is calculated from the <b>effective post-adjustment values</b>, not merely the raw displayed totals. The established engine framework has historically interpreted scores approximately as:</p>
      <ul>
        <li><b>94–100:</b> Excellent Fit</li>
        <li><b>82–93:</b> Fair</li>
        <li><b>65–81:</b> Negotiable</li>
        <li><b>Below 65:</b> rejected by the underlying framework</li>
      </ul>
      <p>An effective-value ratio below roughly <b>72%</b> on the weaker side has historically been a rejection condition, and more recent Finder post-processing has used approximately <b>72/100</b> as a minimum recommendation floor. These are trade-evaluation/recommendation rules; they do not feed backward into individual player values.</p>

      <h3>10. Team context and recommendation logic</h3>
      <p>Once asset values and trade fairness are established, Finder can consider whether the proposal actually makes sense for both teams. Recommendation context can include contender/rebuilder status, expected competitiveness, actual positional depth, relative league strength, whether the outgoing package creates a dangerous roster hole, and whether the other team has a plausible reason to accept.</p>
      <p>This separation is deliberate: <b>valuation answers “what is the asset worth?”</b> while <b>team context answers “who should trade for it, and under what structure?”</b> Team context can change recommendation order without changing the Value shown on the Player Values page.</p>

      <h3>11. Trade Finder controls</h3>
      <p>Finder settings are construction and eligibility controls rather than new valuation formulas. “Make a fair trade,” “Tier up,” “Tier down,” “Acquire draft picks,” “Win-now,” “Future-oriented,” “Add assets if needed,” “Acquire specific player” and “Selected positions only” can change the candidate pool, package construction or recommendation ordering while leaving the master asset values untouched.</p>
      <p>For example, Tier up seeks a stronger centerpiece, Tier down can exchange a premium asset for a lesser centerpiece plus additional value, and Acquire draft picks prioritizes pick-only incoming structures under the selected constraints. Future-oriented can favor younger talent and future assets in recommendation construction, while Win-now can favor current production. None of those modes adds or subtracts points from the permanent Value of the player or pick.</p>

      <h3>12. One valuation system, separate decision layers</h3>
      <p>The methodology is intentionally layered: <b>market consensus → league/scoring refinement → master Value and rank → raw trade totals → trade-only Value Adjustment / Package Quality Penalty → fairness → partner fit and recommendation ordering.</b> Keeping those layers separate prevents a search preference, roster need or trade style from silently rewriting the site's core valuation system.</p>

      <div class="notice" style="margin-top:14px"><b>Presentation only:</b> this Methodology page describes the established system. Its text, headings and numbers are not read by the valuation engine and are not inputs to player values, rankings, consensus calculations, scoring components, draft-pick values, fairness, Finder or Evaluator.</div>
    </div>`;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
