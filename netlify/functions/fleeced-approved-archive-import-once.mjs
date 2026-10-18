// Temporary, authenticated, create-only recovery of the two *exact* approved editions.
// Production only. Remove this function after recovery; never use it for weekly publishing.
import assert from 'node:assert/strict';
import {createHash, timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';

const SITE_ID='d51af6d7-e5f3-4c51-8c6d-25e31db39a0c';
const HASHES={3:'8f2631fd4f83b556daa29d78ab63e92b87a4914e7875ed6799e852397e86715c',4:'038248bef97fd7bfd2bdece6df9c3a538cac9c29ae1bb34487458927c129022c'};
const keyFor=w=>'broadcasts/2026/week-'+String(w).padStart(2,'0')+'.json';
const response=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const secretMatches=(given,secret)=>{
 if(!secret||!given)return false;
 const a=Buffer.from(given),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
};
const store=()=>getStore({name:'fleeced-league-hub',region:'us-east-2',consistency:'strong'});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function createExact(s,key,value){
 const existing=await s.get(key,{type:'json',consistency:'strong'});
 if(existing!==null){
  assert(equal(existing,value),'Protected existing object differs: '+key);
  return false;
 }
 const result=await s.setJSON(key,value,{onlyIfNew:true});
 assert(result?.modified,'Create-only write rejected: '+key);
 const readback=await s.get(key,{type:'json',consistency:'strong'});
 assert(equal(readback,value),'Readback mismatch: '+key);
 return true;
}
async function eachBatch(items,fn){
 for(let i=0;i<items.length;i+=6)await Promise.all(items.slice(i,i+6).map(fn));
}
function validateEdition(e,week){
 assert.equal(e?.available,true);
 assert.equal(Number(e.season),2026);
 assert.equal(Number(e.week),week);
 assert.equal(e.teams?.length,32);
 assert.equal(new Set(e.teams.map(t=>String(t.team_name))).size,32);
 assert.equal(new Set(e.teams.map(t=>String(t.roster_id))).size,32);
 assert.equal(e.reporters?.length,4);
 assert.equal(new Set(e.reporters.map(r=>r.id)).size,4);
 assert(e.league_overview?.headline);
 const reporters=new Set(e.reporters.map(r=>r.id));
 for(const t of e.teams){
  assert(t.inquirer_article?.headline,'Missing article');
  assert(reporters.has(t.inquirer_article.reporter?.id),'Unassigned reporter');
 }
}
async function ensureWeek(s,e){
 const week=e.week,base=keyFor(week);
 await createExact(s,base,e);
 await createExact(s,'inquirer/league-overview/2026/week-'+String(week).padStart(2,'0')+'.json',
  {...e.league_overview,editorial_revision:e.editorial_revision,captured_at:String(e.generated_at||''),published_locked:true});
 await eachBatch(e.teams,async t=>{
  const id=t.inquirer_article.reporter.id;
  const key='inquirer/reporters/'+id+'/articles/2026/week-'+String(week).padStart(2,'0')+'-roster-'+String(t.roster_id).padStart(2,'0')+'.json';
  await createExact(s,key,{...t.inquirer_article,editorial_revision:e.editorial_revision,
   team_name:String(t.team_name||''),manager_name:String(t.manager_name||''),
   captured_at:String(e.generated_at||''),published_locked:true});
 });
}
async function finalize(s,w3,w4){
 const reporters=w4.reporters;
 assert.deepEqual(w3.reporters.map(r=>r.id).sort(),reporters.map(r=>r.id).sort());
 const entries=[];
 for(const reporter of reporters){
  const rows=[];
  for(const e of [w3,w4]){
   for(const team of e.teams.filter(t=>t.inquirer_article.reporter.id===reporter.id)){
    const a=team.inquirer_article;
    rows.push({season:2026,week:e.week,roster_id:String(team.roster_id),team_name:String(team.team_name||''),
     manager_name:String(team.manager_name||''),headline:String(a.headline),byline:String(a.byline||''),
     captured_at:String(e.generated_at||''),broadcast_key:keyFor(e.week),
     article_key:'inquirer/reporters/'+reporter.id+'/articles/2026/week-'+String(e.week).padStart(2,'0')+'-roster-'+String(team.roster_id).padStart(2,'0')+'.json',
     inquirer_version:Number(e.inquirer_version||31),editorial_revision:Number(e.editorial_revision||14),published_locked:true});
   }
   rows.push({season:2026,week:e.week,roster_id:'__league__',team_name:'Weekly Recap',
    manager_name:'Co-authored by all four desks',headline:String(e.league_overview.headline),
    byline:String(e.league_overview.byline||''),captured_at:String(e.generated_at||''),
    broadcast_key:keyFor(e.week),article_key:'inquirer/league-overview/2026/week-'+String(e.week).padStart(2,'0')+'.json',
    inquirer_version:Number(e.inquirer_version||31),editorial_revision:Number(e.editorial_revision||14),published_locked:true});
  }
  rows.sort((a,b)=>b.week-a.week||String(a.team_name).localeCompare(String(b.team_name)));
  entries.push({key:'inquirer/reporters/'+reporter.id+'/index.json',value:{schema_version:1,reporter,articles:rows}});
 }
 await eachBatch(entries,({key,value})=>createExact(s,key,value));
 await createExact(s,'inquirer/reporters/index.json',{schema_version:1,inquirer_version:Number(w4.inquirer_version||31),reporters});
 const old=await s.get('broadcasts/index.json',{type:'json',consistency:'strong'});
 assert(old===null||Array.isArray(old),'Unexpected archive index format');
 const before=old||[];
 const expected=[...before.filter(r=>!(Number(r.season)===2026&&[3,4].includes(Number(r.week)))),
  ...[w3,w4].map(e=>({type:'week',season:2026,week:e.week,key:keyFor(e.week),captured_at:String(e.generated_at||'')}))].sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
 if(!equal(old,expected)){
  if(old===null)await createExact(s,'broadcasts/index.json',expected);
  else{
   const etag=(await s.getMetadata('broadcasts/index.json'))?.etag;
   assert(etag,'Existing index without ETag');
   const result=await s.setJSON('broadcasts/index.json',expected,{onlyIfMatch:etag});
   assert(result?.modified,'Conditional archive index commit failed');
  }
 }
 assert(equal(await s.get('broadcasts/index.json',{type:'json',consistency:'strong'}),expected),'Index readback failed');
 return{weeks:[3,4],teams:64,reporters:4,indexed:true,overwrites:0,deletes:0};
}
export default async (req,context)=>{
 if(req.method!=='POST')return response(405,{error:'POST required'});
 if(context.site?.id!==SITE_ID||context.deploy?.context!=='production')return response(403,{error:'Wrong site or deploy'});
 const secret=Netlify.env.get('FLEECED_ARCHIVE_IMPORT_TOKEN');
 if(!secretMatches(req.headers.get('x-fleeced-import-token')||'',secret))return response(401,{error:'Unauthorized'});
 const week=Number(new URL(req.url).searchParams.get('week'));
 if(!Object.hasOwn(HASHES,week))return response(400,{error:'Only original Week 3 or Week 4 accepted'});
 try{
  const raw=await req.text();
  const hash=createHash('sha256').update(Buffer.from(raw,'utf8')).digest('hex');
  assert.equal(hash,HASHES[week],'Original approved file checksum mismatch');
  const edition=JSON.parse(raw);
  validateEdition(edition,week);
  const s=store();
  if(week===3){await ensureWeek(s,edition);return response(200,{verified:true,staged_week:3,indexed:false});}
  const w3=await s.get(keyFor(3),{type:'json',consistency:'strong'});
  validateEdition(w3,3);
  await ensureWeek(s,edition);
  const result=await finalize(s,w3,edition);
  return response(200,{verified:true,...result});
 }catch(e){console.error('APPROVED ARCHIVE RESTORE FAILED',String(e));return response(409,{error:'Import failed safely',detail:String(e.message||e)});}
};
