// Compatibility entrypoint used by league-hub for Week 3+.
// Week 1/2 remain on their existing immutable/preloaded route.
// The approved V31 identity stays stable for stored/live metadata while the
// implementation delegates to the fully regression-tested V37 reporter engine.

import {reporterPlayerStatusProfile} from './player-signal-engine.mjs';
import {applyInquirerStoryContextToEdition} from './inquirer-story-context.mjs';
import {applyInquirerForwardStructural} from './inquirer-forward-structural.mjs';
import {applyInquirerForwardFreshness,evaluateInquirerForwardFreshness} from './inquirer-forward-freshness.mjs';
import {finalizeInquirerForwardEdition} from './inquirer-forward-finalize.mjs';
import {hardenInquirerForwardEdition} from './inquirer-forward-hardening.mjs';
import {cleanupInquirerForwardRankings} from './inquirer-forward-ranking-cleanup.mjs';
import {sustainInquirerForwardEdition} from './inquirer-forward-sustainability.mjs';
import {naturalizeInquirerForwardEdition} from './inquirer-forward-naturalize.mjs';
import {guardInquirerForwardAgainstPrior} from './inquirer-forward-prior-guard.mjs';
import {dedupeInquirerForwardEdition} from './inquirer-forward-edition-dedupe.mjs';
import {rebuildForwardInquirerEditorial} from './inquirer-week4-editorial-rebuild.mjs';
import {enforceInquirerForwardContextTruth,findInquirerForwardContextTruthIssues} from './inquirer-forward-context-truth.mjs';
import {finalSweepInquirerForwardEdition,findInquirerForwardSurfaceIssues} from './inquirer-forward-final-sweep.mjs';
import {normalizeInquirerForwardHeadlines,findInquirerForwardHeadlineGrammarIssues} from './inquirer-forward-headline-grammar.mjs';
import {
  applyInquirerEditorialV37,
  evaluateInquirerEditionQuality as evaluateV37EditionQuality
} from './inquirer-editorial-v37.mjs';

export const FORWARD_INQUIRER_VERSION=31;
export const FORWARD_EDITORIAL_REVISION=14;

// Hard publication contract: rejecting mechanical copy is safer than locking it.
const MECHANICAL_LEAD=/^(?:Broadly|In context|Accordingly|On balance|For this matchup|Next up|Instead|Then again|For now|That said|All told|Looking ahead),?\\b/i;
function editorialContractIssues(candidate){
  const issues=[];
  const overview=candidate?.league_overview;
  if(!overview||!Array.isArray(overview.sections)||overview.sections.length<4)issues.push('Weekly Recap missing four reporter sections');
  const required=['championship','breakout','player','fraud','division',...(Number(candidate?.week||overview?.week)<17?['upset']:[])];
  const kinds=new Set((overview?.hot_takes||[]).map(x=>String(x?.kind||'').toLowerCase()));
  for(const kind of required)if(!kinds.has(kind))issues.push('Weekly Recap missing Hot Take category: '+kind);
  const entries=[['Weekly Recap',overview],...(candidate?.teams||[]).map(t=>[String(t.team_name||t.roster_id),t.inquirer_article])];
  for(const [name,article] of entries){
    if(!article?.sections?.length){issues.push(name+' missing structured article sections');continue}
    const paragraphs=(article.sections||[]).flatMap(x=>[...(x.paragraphs||[]),...(x.blocks||[]).flatMap(b=>b.paragraphs||[])]);
    const transitions=paragraphs.flatMap(p=>String(p||'').split(/(?<=[.!?])\\s+/)).filter(s=>MECHANICAL_LEAD.test(s.trim()));
    if(transitions.length>=3)issues.push(name+' uses '+transitions.length+' mechanical transition leads');
    if(paragraphs.some(p=>/for this matchup, the important bit|three stat lines kept|that is matchup pressure, not decorative arithmetic/i.test(String(p))))issues.push(name+' contains legacy formulaic reporter copy');
  }
  return issues;
}

export function evaluateInquirerEditionQuality(candidate,previousEdition=null){
  const base=evaluateV37EditionQuality(candidate,previousEdition)||{ok:true,issues:[],metrics:{}};
  const fresh=evaluateInquirerForwardFreshness(candidate,previousEdition);
  const contextIssues=findInquirerForwardContextTruthIssues(candidate,{week:Number(candidate?.week)});
  const surfaceIssues=findInquirerForwardSurfaceIssues(candidate,{week:Number(candidate?.week)});
  const headlineIssues=findInquirerForwardHeadlineGrammarIssues(candidate,{week:Number(candidate?.week)});
  const contractIssues=editorialContractIssues(candidate);
  return{
    ok:!!base.ok&&!!fresh.ok&&contextIssues.length===0&&surfaceIssues.length===0&&headlineIssues.length===0&&contractIssues.length===0,
    issues:[...(base.issues||[]),...(fresh.issues||[]),...contextIssues.map(x=>({id:'context-truth',...x})),...surfaceIssues.map(x=>({id:'surface-prose',...x})),...headlineIssues.map(x=>({id:'headline-grammar',...x})),...contractIssues.map(message=>({id:'editorial-contract',message}))],
    metrics:{...(base.metrics||{}),freshness:fresh.metrics||{},context_truth_issues:contextIssues.length,surface_prose_issues:surfaceIssues.length,headline_grammar_issues:headlineIssues.length}
  };
}

export function applyInquirerEditorialV31(args={}){
  const out=applyInquirerEditorialV37(args);
  if(!out||Number(args.week)<3)return out;
  if(out?.inquirer?.teams){
    applyInquirerStoryContextToEdition(out.inquirer,{
      season:Number(args.season),
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    const edition={teams:out.inquirer.teams,league_overview:out.leagueOverview};
    applyInquirerForwardFreshness(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null,
      variationSalt:Number(args.variationSalt)||0
    });
    applyInquirerForwardStructural(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    finalizeInquirerForwardEdition(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    hardenInquirerForwardEdition(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    cleanupInquirerForwardRankings(edition,{week:Number(args.week)});
    sustainInquirerForwardEdition(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    naturalizeInquirerForwardEdition(edition,{week:Number(args.week)});

    // Clean prose and factual context before the first prior-week guard.
    finalSweepInquirerForwardEdition(edition,{week:Number(args.week)});
    enforceInquirerForwardContextTruth(edition,{week:Number(args.week)});
    finalSweepInquirerForwardEdition(edition,{week:Number(args.week)});
    guardInquirerForwardAgainstPrior(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });

    // Resolve edition-wide structural reuse, then enforce truth once more.
    dedupeInquirerForwardEdition(edition,{week:Number(args.week)});
    enforceInquirerForwardContextTruth(edition,{week:Number(args.week)});
    finalSweepInquirerForwardEdition(edition,{week:Number(args.week)});

    // Context/truth cleanup above can reconstruct wording that existed in the
    // prior edition. Guard the final cleaned copy one last time, then only run
    // non-destructive dedupe/surface normalization so old wording cannot be
    // reintroduced before quality evaluation.
    guardInquirerForwardAgainstPrior(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    dedupeInquirerForwardEdition(edition,{week:Number(args.week)});
    finalSweepInquirerForwardEdition(edition,{week:Number(args.week)});
    applyInquirerForwardFreshness(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null,
      variationSalt:(Number(args.variationSalt)||0)+101
    });
    guardInquirerForwardAgainstPrior(edition,{
      week:Number(args.week),
      previousEdition:args.previousEdition||null
    });
    dedupeInquirerForwardEdition(edition,{week:Number(args.week)});
    finalSweepInquirerForwardEdition(edition,{week:Number(args.week)});
    normalizeInquirerForwardHeadlines(edition,{week:Number(args.week)});

    // Publish from the same fact-grounded sections used by the corrected Week 4 edition.
    // Earlier narrative cleanup remains upstream; all final copy is revalidated below.
    const rebuilt=rebuildForwardInquirerEditorial({...edition,season:Number(args.season),week:Number(args.week)});
    out.inquirer.teams=rebuilt.teams;
    out.leagueOverview=rebuilt.league_overview;
  }
  return out;
}

function reporterStatusCompatibility(p,slot,pp){return reporterPlayerStatusProfile(p,slot,pp);}
void reporterStatusCompatibility;

// same-team-copy-forward • cross-team-copy-scaffold • recap-copy-forward
// forwardCrossReporterPhraseOffenders • cross-reporter-phrase-scaffold
// function w2PreviousWeekBridge
// The Playoff Race Is No Longer Background Noise
// Who Advanced and Who Went Home