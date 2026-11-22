// Read-only GitHub Actions-published editions. No Netlify Blob restore or
// internal HTTP job is needed for future issue visibility.
import {createHash} from 'node:crypto';
const ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/';
// PR 574 has an isolated, fully published preview edition. Production and
// every other preview continue to read ONLY the approved inquirer-archive.
export function githubInquirerArchiveBranch(env=process.env){
 const context=String(env.CONTEXT||globalThis.Netlify?.env?.get?.('CONTEXT')||'');
 const review=String(env.REVIEW_ID||globalThis.Netlify?.env?.get?.('REVIEW_ID')||'');
 return context==='deploy-preview'&&review==='574'?'inquirer-preview-574-r2':'inquirer-archive';
}
const publishedRoot=()=>ROOT+githubInquirerArchiveBranch()+'/inquirer-archive/';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
let cache=null,expires=0,cachedRoot='';
const get=async(file,fetcher)=>{
 const response=await fetcher(publishedRoot()+file,{cache:'no-store',headers:{accept:'application/json'}});
 if(!response.ok){if(response.status===404)return null;throw Error('GitHub Inquirer '+file+' HTTP '+response.status)}
 return Buffer.from(await response.arrayBuffer());
};
export async function githubPublishedInquirerIndex(fetcher=fetch,{refresh=false}={}){
 const root=publishedRoot();
 if(!refresh&&fetcher===fetch&&cache&&cachedRoot===root&&Date.now()<expires)return cache;
 const bytes=await get('forward/index.json',fetcher);
 if(bytes===null)return{reports:[],editions:new Map()};
 const data=JSON.parse(bytes.toString('utf8'));
 if(data.schema_version!==1||!Array.isArray(data.reports))
  throw Error('Invalid GitHub forward newspaper publication index');
 const reports=[],editions=new Map(),seen=new Set();
 for(const row of data.reports){
  const week=Number(row.week),season=Number(row.season),file='forward/2026/week-'+String(week).padStart(2,'0')+'.json';
  if(season!==2026||!Number.isInteger(week)||week<10||week>17||seen.has(week)||
   row.path!==file||!/^[a-f0-9]{64}$/.test(row.sha256||'')||
   Number(row.team_count)!==32)
   throw Error('Invalid GitHub forward issue index entry');
  seen.add(week);editions.set(week,{file,sha256:row.sha256});
  reports.push({type:'week',season,week,key:'github-inquirer:'+file,
   captured_at:row.generated_at,github_native:true});
 }
 const weeks=[...seen].sort((a,b)=>a-b);
 if(weeks.some((w,i)=>w!==10+i))throw Error('Nonsequential forward issues: cannot advance Inquirer reader');
 const result={reports,editions};
 if(fetcher===fetch){cache=result;cachedRoot=root;expires=Date.now()+60000}
 return result;
}
export async function githubPublishedInquirerEdition(season,week,fetcher=fetch){
 if(Number(season)!==2026||!Number.isInteger(Number(week))||week<10||week>17)return null;
 const index=await githubPublishedInquirerIndex(fetcher);
 const row=index.editions.get(Number(week));
 if(!row)return null;
 const bytes=await get(row.file,fetcher);
 if(!bytes||hash(bytes)!==row.sha256)throw Error('GitHub weekly newspaper digest mismatch');
 const edition=JSON.parse(bytes.toString('utf8'));
 if(edition.available!==true||edition.published_locked!==true||
    Number(edition.season)!==2026||Number(edition.week)!==Number(week)||
    edition.editorial_generation?.engine!=='v31-forward'||
    !Array.isArray(edition.teams)||edition.teams.length!==32||
    new Set(edition.teams.map(t=>String(t.roster_id))).size!==32||
    edition.teams.some(t=>!t.inquirer_article?.headline)||
    !edition.league_overview?.headline)
  throw Error('GitHub edition failed published integrity checks');
 return edition;
}
