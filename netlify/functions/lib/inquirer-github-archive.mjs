import {createHash} from 'node:crypto';
import {inspectCanonicalArchive} from './inquirer-legacy-history.mjs';

// Published copy archive, independent of the Netlify site's Blob account.
// Only the append-only `inquirer-archive` Git ref may supply historical data.
const ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/inquirer-archive/inquirer-archive/';
const digest=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const expectedPath=(season,week)=>String(season)+'/week-'+String(week).padStart(2,'0')+'.json';
const exactEntry=row=>{
 const season=Number(row?.season),week=Number(row?.week),hash=String(row?.sha256||'').toLowerCase();
 if(!Number.isInteger(season)||season<2026||season>2100||
    !Number.isInteger(week)||week<1||week>18||
    !/^[a-f0-9]{64}$/.test(hash))return null;
 const path=expectedPath(season,week);
 if(row.path!==path)return null;
 return{season,week,path,sha256:hash};
};
const fetchText=async(path,fetcher=fetch)=>{
 const response=await fetcher(ROOT+path,{cache:'no-store',signal:AbortSignal.timeout(5500)});
 if(!response.ok)throw Error('GitHub archive HTTP '+response.status);
 return response.text();
};
export async function githubPublishedArchiveEntries({fetcher=fetch}={}){
 try{
  const manifest=JSON.parse(await fetchText('manifest.json',fetcher));
  if(manifest?.schema_version!==1||!Array.isArray(manifest?.entries)||manifest.entries.length>300)
   throw Error('Invalid immutable archive manifest');
  const rows=[],seen=new Set();
  for(const raw of manifest.entries){
   const row=exactEntry(raw),id=row&&row.season+'|'+row.week;
   if(!row||seen.has(id))throw Error('Unverified or duplicate GitHub archive manifest record');
   seen.add(id);rows.push(row);
  }
  return rows;
 }catch(error){
  console.warn('inquirer-github-archive-manifest-unavailable',String(error?.message||error));
  return [];
 }
}
export async function githubPublishedEdition(season,week,{fetcher=fetch,entries=null}={}){
 const rows=entries||await githubPublishedArchiveEntries({fetcher});
 const entry=rows.find(r=>r.season===Number(season)&&r.week===Number(week));
 if(!entry)return null;
 try{
  const raw=await fetchText(entry.path,fetcher);
  if(digest(raw)!==entry.sha256)throw Error('Archived newspaper SHA-256 mismatch');
  const edition=JSON.parse(raw);
  if(!inspectCanonicalArchive(edition,entry.season,entry.week).ok)
   throw Error('Archived newspaper failed locked publication contract');
  return edition;
 }catch(error){
  console.warn('inquirer-github-archive-readback-rejected',{
   season:entry.season,week:entry.week,reason:String(error?.message||error)});
  return null;
 }
}
export async function githubVerifiedArchiveRows({fetcher=fetch}={}){
 const entries=await githubPublishedArchiveEntries({fetcher});
 const copies=await Promise.all(entries.map(r=>githubPublishedEdition(r.season,r.week,{fetcher,entries})));
 return entries.filter((r,i)=>copies[i]).map(row=>({
  type:'week',season:row.season,week:row.week,
  key:'github:'+row.path,source:'github-verified',captured_at:''
 }));
}
