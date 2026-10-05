import {getStore} from '@netlify/blobs';
import week1Preload2026 from './inquirer-week1-2026-preload.mjs';
import week2Preload2026 from './inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';

const reporters=[
  {id:'walter-mercer',name:'Nick Swindell',title:'Senior Football Correspondent',desk:'The Old Desk',signature:'Keep the clipping. Hide the parade route.'},
  {id:'tess-delaney',name:'Bartholomew Roycington III',title:'Columnist at Large',desk:'The Velvet Rope',signature:'Winning is vulgar, addictive and highly recommended.'},
  {id:'mack-hollis',name:'Tilly Fleecer',title:'Tabloid Sports Editor',desk:'The Back Page',signature:'If it happened, it belongs in 48-point type.'},
  {id:'nora-voss',name:'Jefferson Filch',title:'Investigations & Front Office',desk:'The Inquiry Desk',signature:'Every lineup leaves fingerprints.'}
];
const store=()=>getStore('fleeced-league-hub',{consistency:'strong'});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','netlify-cdn-cache-control':'no-store','x-fleeced-read-fast':'2'}});
const week2=()=>applyWeek2EditorialR16(week2Preload2026);

async function archiveRows(){
  const s=store(),idx=await s.get('broadcasts/index.json',{type:'json'}).catch(()=>[]),rows=Array.isArray(idx)?idx.slice():[];
  for(const p of [week1Preload2026,week2Preload2026]){
    const season=Number(p.season),week=Number(p.week),key=`${season}|${week}`;
    if(!rows.some(x=>`${Number(x.season)}|${Number(x.week)}`===key))rows.push({type:'week',season,week,key:`preloaded:${season}:${week}`,captured_at:String(p.generated_at||''),preloaded:true});
  }
  rows.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
  return rows;
}

async function latest(){
  const rows=await archiveRows(),candidates=rows.slice().sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week));
  for(const row of candidates){
    const season=Number(row.season),week=Number(row.week);
    if(season===2026&&week===2)return week2();
    if(season===2026&&week===1)return week1Preload2026;
    if(!season||!week)continue;
    const s=store(),stored=await s.get(`broadcasts/${season}/week-${String(week).padStart(2,'0')}.json`,{type:'json'}).catch(()=>null);
    if(stored?.available&&Array.isArray(stored.teams)&&stored.teams.length)return stored;
  }
  return week2();
}

async function managerSnapshot(){
  const cached=await store().get('managers/history-cache.json',{type:'json'}).catch(()=>null);
  return cached&&Array.isArray(cached.current)?{...cached,cache_hit:true,snapshot_only:true}:{current:[],graveyard:[],career:[],assignments:[],games:[],snapshot_only:true};
}

async function weeklyAwardsSnapshot(){
  const cached=await store().get('awards/weekly.json',{type:'json'}).catch(()=>null);
  if(Array.isArray(cached?.records))return{schema_version:Number(cached.schema_version)||1,records:cached.records,snapshot_only:true};
  if(Array.isArray(cached))return{schema_version:1,records:cached,snapshot_only:true};
  return{schema_version:1,records:[],snapshot_only:true};
}

export default async req=>{
  try{
    const u=new URL(req.url),mode=String(u.searchParams.get('mode')||'latest');
    if(mode==='archive')return json({reports:await archiveRows()});
    if(mode==='reporters')return json({schema_version:1,inquirer_version:26,reporters});
    if(mode==='latest')return json(await latest());
    if(mode==='managers')return json(await managerSnapshot());
    if(mode==='weekly-awards')return json(await weeklyAwardsSnapshot());
    return json({error:'unsupported mode'},400);
  }catch(e){
    console.error('league-hub-read-fast',e);
    return json({error:'League Hub read unavailable'},503);
  }
};
