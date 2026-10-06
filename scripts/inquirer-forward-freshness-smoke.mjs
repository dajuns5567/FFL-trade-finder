import assert from 'node:assert/strict';
import week2raw from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16} from '../netlify/functions/inquirer-week2-editorial-r28.mjs';
import {applyInquirerEditorialV31,evaluateInquirerEditionQuality,FORWARD_INQUIRER_VERSION,FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';

const clone=x=>structuredClone(x);
const week2=applyWeek2EditorialR16(clone(week2raw));
const sentenceSplit=v=>String(v||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const articleSentences=a=>(a?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).flatMap(sentenceSplit);
const normalize=s=>String(s||'').toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const editionSentences=e=>[...(e?.teams||[]).flatMap(t=>articleSentences(t?.inquirer_article)),...articleSentences(e?.league_overview)].map(normalize).filter(Boolean);

function rawForWeek(week){
  const teams=clone(week2.teams).map((t,i)=>{
    const bump=((i%7)-3)*2.3+(week-2)*1.4;
    const oppBump=((i%5)-2)*1.1-(week-2)*0.6;
    const points=Number((Number(t.points)+bump).toFixed(1));
    const opponent_points=Number((Number(t.opponent_points)+oppBump).toFixed(1));
    const record=t?.league_context?.record||{};
    const priorWins=Number(record.wins)||0,priorLosses=Number(record.losses)||0;
    return {
      ...t,
      week,
      points,
      opponent_points,
      won:points>opponent_points,
      projected:Number((Number(t.projected||points)+(i%3-1)*2.2).toFixed(1)),
      week_classification:inquirerWeekClassification(week,2026,t.conference),
      league_context:{
        ...(t.league_context||{}),
        snapshot_through_week:week,
        standings_rank:((i+(week-2)*3)%32)+1,
        record:{wins:priorWins+(points>opponent_points?week-2:0),losses:priorLosses+(points<=opponent_points?week-2:0),ties:0},
        playoff_seed:(i%16)+1,
        playoff_teams_per_conference:8,
        inside_playoff_line:(i%16)+1<=8,
        division_leader:i%4===((week-2)%4)
      },
      starter_details:(t.starter_details||[]).map((p,j)=>({
        ...p,
        points:Number((Number(p.points)+(j===0?(week-2)*2.4:j===1?-(week-2)*0.7:((j%3)-1)*0.6)).toFixed(1)),
        season_avg:Number((Number(p.season_avg||p.points)+(week-2)*(j%2?0.4:0.9)).toFixed(2))
      }))
    };
  });
  // Force a few materially different weekly storylines so the forward engine
  // must use different score bands and commentary rather than coast on one form.
  teams[0].points=42+week;teams[0].opponent_points=132-week;teams[0].won=false;
  teams[1].points=176+week;teams[1].opponent_points=101+week/2;teams[1].won=true;
  teams[2].points=118+week;teams[2].opponent_points=117+week;teams[2].won=true;
  const overview=clone(week2.league_overview);
  overview.week=week;overview.week_classification=inquirerWeekClassification(week,2026);
  return {rawInquirer:{reporters:clone(week2.reporters),teams},rawOverview:overview};
}

function buildWeek(week,previousEdition){
  const raw=rawForWeek(week),classification=inquirerWeekClassification(week,2026);
  let accepted=null,last=null;
  for(let salt=0;salt<8;salt++){
    const edited=applyInquirerEditorialV31({season:2026,week,...raw,previousEdition,weekClassification:classification,variationSalt:salt});
    const candidate={available:true,season:2026,week,inquirer_version:FORWARD_INQUIRER_VERSION,editorial_revision:FORWARD_EDITORIAL_REVISION,teams:edited.inquirer.teams,league_overview:edited.leagueOverview,editorial_generation:{variation_salt:salt}};
    const quality=evaluateInquirerEditionQuality(candidate,previousEdition);last=quality;
    if(quality.ok){accepted={candidate,quality,salt};break}
  }
  assert.ok(accepted,`Week ${week} must find an accepted forward edition within 8 salts; issues=${JSON.stringify(last?.issues||[])}`);
  return accepted;
}

let previous=week2;
const results=[];
for(let week=3;week<=17;week++){
  const {candidate,quality,salt}=buildWeek(week,previous);
  assert.equal(candidate.teams.length,32,`Week ${week} must have 32 team articles`);
  assert.equal(candidate.inquirer_version,31);
  assert.equal(candidate.editorial_revision,14);
  assert.match(String(candidate.league_overview?.headline||''),new RegExp(`Week ${week}`,'i'),`Week ${week} recap headline must be current`);
  assert.ok(candidate.teams.every(t=>Number(t?.inquirer_article?.week)===week),`Week ${week} article metadata must be current`);

  const copy=[...candidate.teams.flatMap(t=>articleSentences(t?.inquirer_article)),...articleSentences(candidate.league_overview)].join(' ');
  assert.doesNotMatch(copy,/\b(?:the Fleeced signal says|Fleeced signal indicates|according to the Fleeced signal)\b/i,'Signals must read naturally, never as database citations');
  assert.doesNotMatch(copy,/\b(?:copy desk|newsroom|this article|same paragraph|same sentence|sample size|one repeat|new piece of proof|hostile questioning)\b/i,'Forward prose must remain free of newsroom/meta scaffolding');

  const currentSet=new Set(editionSentences(candidate)),priorSet=new Set(editionSentences(previous));
  const reused=[...currentSet].filter(x=>priorSet.has(x));
  assert.ok(reused.length<=8,`Week ${week} reused too many exact-normalized sentences from prior edition: ${reused.length}`);

  const reporterCounts=new Map();
  for(const t of candidate.teams){const id=String(t?.inquirer_article?.reporter?.id||'');reporterCounts.set(id,(reporterCounts.get(id)||0)+1)}
  assert.equal(reporterCounts.size,4,`Week ${week} must keep all four reporter desks active`);
  for(const [id,n] of reporterCounts)assert.equal(n,8,`Week ${week} reporter ${id} must own 8 teams`);

  const standingsArticles=candidate.teams.filter(t=>/\b(?:division|standings|overall|\d+(?:st|nd|rd|th))\b/i.test((t.inquirer_article?.paragraphs||[]).join(' '))).length;
  assert.ok(standingsArticles>=24,`Week ${week} should naturally reference standings/division context across most team columns; found ${standingsArticles}`);

  results.push({week,salt,quality:quality.metrics,reused_from_prior:reused.length,standings_articles:standingsArticles});
  previous=candidate;
}

console.log(JSON.stringify({ok:true,version:FORWARD_INQUIRER_VERSION,revision:FORWARD_EDITORIAL_REVISION,validated_through_week:17,weeks:results},null,2));
