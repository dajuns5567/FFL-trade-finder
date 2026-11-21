import {createHash} from 'node:crypto';
import {githubPublishedArchiveEntries,githubPublishedEdition} from './inquirer-github-archive.mjs';
import {verifiedNewSiteCutoverHistory,verifiedWeekNineAutopublishCutoverHistory} from './inquirer-replacement-archive-gate.mjs';

// The original, immutable newspaper copies and their separately recovered
// publication index and weekly awards live on the GitHub archive branch.
// This read-only continuity check does NOT copy data to a Netlify account.
const ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/inquirer-archive/inquirer-archive/evidence/2026/';
const EVIDENCE_SHA256=Object.freeze({
 'index.json':'630f63bf82ce84307b921c2ced829fb717276421c5873525dac5ba84af7b3d68',
 'weekly.json':'1255a75d8cd55652930e0bfce8f5ffc7cc92c8d1d8d95aa1cdb3ba67fec9df68'
});
const digest=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
async function verifiedEvidence(filename,fetcher){
 const response=await fetcher(ROOT+filename,{cache:'no-store',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('Archive evidence unavailable: '+filename);
 const raw=await response.text();
 if(digest(raw)!==EVIDENCE_SHA256[filename])throw Error('Original archive evidence checksum mismatch: '+filename);
 return JSON.parse(raw);
}
export async function githubVerifiedHistoricalPublisherBaseline({fetcher=fetch}={}){
 try{
  const entries=await githubPublishedArchiveEntries({fetcher});
  const required=[3,4,5,6,7,8,9];
  if(required.some(week=>!entries.some(row=>row.season===2026&&row.week===week)))
   return{ready:false,reason:'GitHub published archive does not contain all original Weeks 3–9'};
  const [copies,index,awards]=await Promise.all([
   Promise.all(required.map(week=>githubPublishedEdition(2026,week,{fetcher,entries}))),
   verifiedEvidence('index.json',fetcher),
   verifiedEvidence('weekly.json',fetcher)
  ]);
  if(copies.some(x=>!x))return{ready:false,reason:'GitHub original newspaper failed immutable checksum verification'};
  const byWeek=new Map(copies.map(x=>[Number(x.week),x]));
  const baseline=verifiedNewSiteCutoverHistory({
   week3:byWeek.get(3),week4:byWeek.get(4),week5:byWeek.get(5),week6:byWeek.get(6),index,awards
  });
  if(!baseline.ready)return{ready:false,reason:'Archived historical baseline: '+baseline.reason};
  const forward=verifiedWeekNineAutopublishCutoverHistory({
   week7:byWeek.get(7),week8:byWeek.get(8),index,awards
  });
  if(!forward.ready)return{ready:false,reason:'Archived Week 7/8 continuity: '+forward.reason};
  const week9=byWeek.get(9);
  const index9=index.filter(r=>Number(r?.season)===2026&&Number(r?.week)===9);
  const awards9=awards?.records?.filter(r=>Number(r?.season)===2026&&Number(r?.week)===9)||[];
  const rec=awards9[0];
  if(index9.length!==1||awards9.length!==1||
     index9[0].key!=='broadcasts/2026/week-09.json'||
     index9[0].captured_at!==week9.generated_at||
     rec.captured_at!==week9.generated_at||
     rec.newsroom_editorial_revision!==week9.editorial_revision||
     rec.newsroom_engine!=='v31-forward'||
     !rec.players_of_week?.offense?.player_id||
     !rec.players_of_week?.defense?.player_id||
     !['highest-scorer','lowest-scorer'].every(type=>rec.manager_awards?.some(x=>x.type===type)))
   return{ready:false,reason:'Original Week 9 publication index or awards do not match verified GitHub newspaper'};
  return{ready:true,reason:'Immutable GitHub original 2026 Weeks 3–9 and published index/awards independently verified',
   latestPublishedWeek:9,verifiedWeeks:required,indexedWeeks:required,awardedWeeks:required};
 }catch(error){
  return{ready:false,reason:'GitHub historical publication continuity unavailable: '+String(error?.message||error)};
 }
}
