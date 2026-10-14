#!/usr/bin/env node
// Build a read-only, fact-sourced newsroom assignment packet from a completed
// draft edition, without publishing or fabricating editorial prose.
// Usage: node scripts/inquirer-prep-future-editorial.mjs candidate.json previous.json
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const [candidatePath,priorPath]=process.argv.slice(2);
assert(candidatePath&&priorPath,'Provide candidate completed edition and last accepted edition');
const c=read(candidatePath),prior=read(priorPath);
const week=Number(c.week),season=Number(c.season);
assert(Number.isInteger(week)&&week>4&&week<=17&&season>=2026,'A completed future regular-season edition is required');
assert(Array.isArray(c.teams)&&c.teams.length===32,'Require 32 team fact records');
assert(Number(prior.week)<week,'Prior edition must precede the candidate');
const priorTeams=new Map((prior.teams||prior.articles||[]).map(t=>[t.team_name||t.team,t]));
const sections=['lede','players','management','hot-seat','cool-throne','sentiment','outlook'];
const empty=()=>Object.fromEntries(sections.map(k=>[k,[]]));
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const teamBriefs={},assignments=[];
for(const t of c.teams){
 const name=t.team_name;assert(name&&t.inquirer_article,'Missing named team or reporter article');
 const reporter=t.inquirer_article.reporter||{};
 const opponent=t.next_opponent_name||null;
 const previous=priorTeams.get(name);
 const last=previous?.inquirer_article||previous;
 const starters=(t.starter_details||[]).map(p=>({name:p.name,slot:p.lineup_slot,position:p.position,points:number(p.points),projected:number(p.projected)}));
 const bench=t.best_lineup_miss||t.inquirer_article?.facts?.best_lineup_miss||null;
 assignments.push({
  team:name,
  reporter:{id:reporter.id,name:reporter.name,voice:reporter.voice,signature:reporter.signature},
  completed_result:{season,week,score:number(t.points),opponent:t.opponent_name,opponent_score:number(t.opponent_points)},
  next_opponent:opponent,
  roster:{starters,bench_decision:bench&&{slot:bench.slot,gap:number(bench.gap),starter:bench.starter&&{name:bench.starter.name,points:number(bench.starter.points)},reserve:bench.reserve&&{name:bench.reserve.name,points:number(bench.reserve.points)}}},
  fan_sentiment:t.inquirer_article.fan_sentiment,
  last_accepted_sections:(last?.sections||[]).map(s=>({kind:s.kind,paragraphs:s.paragraphs||[]})),
  assignment:{
   unique_angle:'Write a new source-grounded thesis, different from prior weeks and this week’s other teams',
   player_analysis:'Integrate real scored production and an argument; do not list scores as commentary',
   management:'Distinguish legal missed points from unavoidable loss; do not fabricate alternatives',
   hot_and_cool:'Issue blunt independent accountability and earned admiration, without replaying the lede',
   crowd:'Create a fresh clearly hypothetical fan scene calibrated to measured mood and interpret public trust',
   next_matchup:'Name verified next opponent and explain a genuinely new forward-looking conflict',
   reporter_voice:'Use this reporter’s personality, not recycled paragraphs or a rotating catchphrase bank',
   review:'Reject weak humor, generic stat explanations, copied rhetorical setups and factual leaps'
  }
 });
 teamBriefs[name]={
  opponent:String(opponent||''),
  reporter_id:String(reporter.id||''),
  team_points:number(t.points),
  opponent_points:number(t.opponent_points),
  ...empty()
 };
}
assert(Object.keys(teamBriefs).length===32,'Unique teams required');
const overview=c.league_overview||{};
const recapKeys=(overview.sections||[]).flatMap(s=>s.blocks?.length?s.blocks.map(b=>b.kind):[s.heading]);
assert(recapKeys.length>0,'League recap desks missing');
const recap=Object.fromEntries(recapKeys.map(k=>[k,[]]));
const packet={
 briefing_packet_version:1,
 season,week,source:'completed-week candidate edition',
 reference_week:Number(prior.week),
 instructions:'FACT PACKET ONLY. All team sections and recap are intentionally blank; draft original prose, verify the facts, compare previous accepted issue, complete the quality checks, then obtain independent editorial approval before depositing the manifest in trusted server storage.',
 assignments,
 draft_manifest:{
  season,week,teams:teamBriefs,recap,
  editorial_approval:{approved:false,season,week,reviewed_by:'',reviewed_at:''}
 }
};
process.stdout.write(JSON.stringify(packet,null,2)+'\n');
