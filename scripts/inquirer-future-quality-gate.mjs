#!/usr/bin/env node
// Read-only future edition editorial quality gate.
// Usage: node scripts/inquirer-future-quality-gate.mjs NEW.json [PREVIOUS.json]
// Accepts the raw edition API payload or an independent editorial audit JSON.
// A failed gate means HOLD FOR REVIEW, never silently alter or publish copy.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const text=x=>String(x??'').replace(/\s+/g,' ').trim();
const sentence=x=>text(x).split(/(?<=[.!?])\s+(?=[A-Z"'“‘])/).filter(Boolean);
const tok=x=>new Set((text(x).toLowerCase().match(/[a-z]{4,}/g)||[])
 .filter(w=>!new Set(['that','with','from','their','this','they','have','were','will','would','still','what','about','there','after','before','could','should','into','while','because','which','where','when','more','just','than','them','only']).has(w)));
const similarity=(a,b)=>{const x=tok(a),y=tok(b);return x.size&&y.size?[...x].filter(t=>y.has(t)).length/new Set([...x,...y]).size:0};
const shape=d=>(d.articles?d.articles:(d.teams||[]).map(t=>({
 team:t.team_name, opponent:t.opponent_name, reporter:t.inquirer_article?.reporter?.name,
 sections:t.inquirer_article?.sections||[],starters:t.starter_details||[],
 benchDecision:t.best_lineup_miss,score:t.points,opponentScore:t.opponent_points,
 future_brief_status:t.inquirer_article?.future_brief_status,
 editorial_review_required:t.inquirer_article?.editorial_review_required
})));
const get=(a,k)=>(a.sections||[]).find(s=>s.kind===k)?.paragraphs?.join(' ')||'';
const errors=[],warnings=[];
const bad=(team,code,detail)=>errors.push({team,code,detail});
const warn=(team,code,detail)=>warnings.push({team,code,detail});
const edition=load(process.argv[2]||'');
const previous=process.argv[3]?load(process.argv[3]):null;
const articles=shape(edition);
assert.equal(articles.length,32,'Must inspect all 32 teams; HOLD on incomplete editions');
const names=new Set(articles.map(a=>a.team));
assert.equal(names.size,32,'Duplicate teams in edition');
const week=Number(edition.week);
const prev=previous?shape(previous):[];
if(previous && Number(previous.week)===week)warn('edition','SAME_WEEK_REFERENCE','Reference is the same week; cross-week novelty cannot be verified');
const previousByTeam=new Map(prev.map(a=>[a.team,a]));
const shared=new Map();
let totalContrast=0;
const theater=/imaginary|fictional|satirical|cartoon|pretend/i;
const scene=/pitchfork|parade|champagne|protest|bartender|firework|statue|fountain|crowd|street|march|party|sign|toast|convertible|stadium|confetti|cardboard zero/i;
const technical=/eligible points|verified legal rescue|projection provenance|consult live week \d+ projections|the reporter should|this article should/i;
const contrast=/\bnot\b.{3,90}\bbut\b|\b(?:isn't|wasn't|weren't|is not|was not)\b.{3,100}[;—,]\s*(?:it|that|this)\s+(?:is|was|were)\b/i;
const required=['lede','players','management','hot-seat','cool-throne','sentiment','outlook'];
for(const a of articles){
 const id=a.team||'unknown';
 if(week>4&&a.future_brief_status!=='COMPLETE_UNAPPROVED')bad(id,'MISSING_FRESH_EDITORIAL_BRIEF','A verified week-specific brief is required for publication quality; never reuse last week');
 const sections=a.sections||[];
 for(const k of required)if(!get(a,k))bad(id,'EMPTY_REQUIRED_SECTION',k);
 const fan=get(a,'sentiment');
 const prose=sections.flatMap(s=>s.paragraphs||[]).join(' ');
 if(!theater.test(fan)||!scene.test(fan))bad(id,'FAN_SCENE_MISSING','Distinct fictional sports-fan scene not detected');
 if(technical.test(prose))bad(id,'EDITORIAL_TECHNICAL_LANGUAGE','Metadata terminology entered reporter copy');
 if(!text(get(a,'outlook')).match(/next opponent|next faces|next plays|next meets|week \d+|comes next|face|visit|host/i))warn(id,'OUTLOOK_REVIEW','Future opponent may be missing');
 const wc=(text(prose).match(/[\w'-]+/g)||[]).length;
 if(wc<250)bad(id,'THIN_ARTICLE',wc+' words');
 if(wc>850)warn(id,'OVERLONG_ARTICLE',wc+' words');
 const sentenceKeys=new Set();
 for(const s of sections)for(const p of s.paragraphs||[])for(const t of sentence(p)){
  const key=t.toLowerCase().replace(/\d+(?:\.\d+)?/g,'#').replace(/\s+/g,' ').trim();
  if(key.length>60){if(sentenceKeys.has(key))warn(id,'WITHIN_ARTICLE_REPEAT',t);sentenceKeys.add(key)}
  if(contrast.test(t))totalContrast++;
  if(key.length>65){const arr=shared.get(key)||[];arr.push(id);shared.set(key,arr)}
 }
 const playerText=get(a,'players');
 if(/\(\d+(?:\.\d+)?\s+pts\)\s+\d+(?:\.\d+)?\b/i.test(playerText))bad(id,'DUPLICATE_PLAYER_SCORE','Injected label followed by naked score');
 const starters=a.starters||[];
 for(const p of starters){const point=Number(p.points);if(!p.name||!Number.isFinite(point))continue;
  const full=String(p.name).toLowerCase();if(playerText.toLowerCase().includes(full)&&!playerText.includes(point.toFixed(1)))warn(id,'PLAYER_SCORE_REVIEW',p.name);
 }
 const bench=a.benchDecision;
 if(bench?.starter&&bench?.reserve&&Number.isFinite(Number(bench.gap))){
  const gap=Number(bench.reserve.points)-Number(bench.starter.points);
  if(Math.abs(gap-Number(bench.gap))>0.11)bad(id,'BENCH_ARITHMETIC',String({gap,claimed:bench.gap}));
 }
 const older=previousByTeam.get(id);
 if(older&&Number(previous.week)!==week){
  const pairs=['lede','players','management','hot-seat','cool-throne','sentiment','outlook'];
  for(const k of pairs){const current=get(a,k),prior=get(older,k);
   if(current.length>70&&prior.length>70){
    const sim=similarity(current,prior);
    if(text(current)===text(prior))bad(id,'VERBATIM_CROSS_WEEK_'+k,'Identical section in different weeks');
    else if(sim>=0.72)warn(id,'HIGH_CROSS_WEEK_SIMILARITY_'+k,sim.toFixed(3));
   }
  }
 }
}
for(const [key,teams] of shared){if(new Set(teams).size>1)bad(teams.join(', '),'REUSED_CROSS_TEAM_SENTENCE',key)}
if(totalContrast>=30)warn('edition','CONTRAST_RHYTHM','Many repeated not-X-but-Y constructions: '+totalContrast);
const recap=edition.weeklyRecap||edition.league_overview;
if(!recap)bad('edition','RECAP_MISSING','No Weekly Recap found');
else {
 const body=recap.fullText||JSON.stringify(recap.sections||[]);
 if(text(body).length<600)bad('edition','RECAP_TOO_SHORT','No substantial recap found');
 if(previous){
  const old=previous.weeklyRecap||previous.league_overview;
  const earlier=old?.fullText||JSON.stringify(old?.sections||[]);
  if(earlier&&text(body)===text(earlier)&&Number(previous.week)!==week)bad('edition','RECAP_REUSED_VERBATIM','Entire Weekly Recap unchanged');
  else if(earlier&&similarity(body,earlier)>=0.75&&Number(previous.week)!==week)warn('edition','HIGH_RECAP_CROSS_WEEK_SIMILARITY',similarity(body,earlier).toFixed(3));
 }
}
const result={week,articles:articles.length,errors,warnings,contrastSentences:totalContrast,
 status:errors.length?'HOLD':'STRUCTURAL_PASS_EDITORIAL_REVIEW_REQUIRED',
 note:'Passing is not permission to publish. The distinct story angles, reporter voices, factual claims, humor, and recap must be manually assessed against last week.'};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
