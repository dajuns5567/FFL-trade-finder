const URL="https://www.fantasypros.com/nfl/rankings/dynasty-superflex.php";
const TIMEOUT_MS=10000;

function assignedJson(text, variableName){
  const source=String(text||"");
  const marker=new RegExp(`(?:var|let|const|window\\.)?\\s*${variableName}\\s*=\\s*`);
  const match=marker.exec(source);
  if(!match)return null;
  const start=source.indexOf("{",match.index+match[0].length);
  if(start<0)return null;
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<source.length;i++){
    const ch=source[i];
    if(quoted){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')quoted=false;continue;}
    if(ch==='"'){quoted=true;continue;}
    if(ch==="{")depth++;
    else if(ch==="}"&&--depth===0){try{return JSON.parse(source.slice(start,i+1))}catch{return null}}
  }
  return null;
}

const norm=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"").replace(/[^a-z0-9]+/gi," ").trim().toLowerCase();

export default async()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(URL,{headers:{"user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)","accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"},redirect:"follow",signal:controller.signal});
    const text=await res.text();
    const payload=assignedJson(text,"ecrData");
    const players=Array.isArray(payload?.players)?payload.players:[];
    const rows=players.map(p=>({rank:Number(p?.rank_ecr),player:String(p?.player_name||"").trim(),position:String(p?.player_position_id||p?.player_position||p?.position||"").trim().toUpperCase(),team:String(p?.player_team_id||p?.player_team||p?.team||"").trim().toUpperCase()})).filter(r=>Number.isFinite(r.rank)&&r.rank>0&&r.player).sort((a,b)=>a.rank-b.rank);
    const ranks=rows.map(r=>r.rank),rankSet=new Set(ranks),missing=[];
    if(ranks.length){for(let i=Math.min(...ranks);i<=Math.max(...ranks);i++)if(!rankSet.has(i))missing.push(i)}
    const names=new Map();for(const r of rows){const k=norm(r.player);names.set(k,(names.get(k)||0)+1)}
    const duplicateNames=[...names.entries()].filter(([,n])=>n>1).map(([name,count])=>({name,count})).slice(0,20);
    const positions={};for(const r of rows)positions[r.position||"UNKNOWN"]=(positions[r.position||"UNKNOWN"]||0)+1;
    const markerText=text.replace(/\s+/g," ");
    const title=markerText.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g," ").trim()||null;
    const h1=markerText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g," ").trim()||null;
    const loginMarkers=["log in","login","sign in","premium","upgrade","locked"].filter(x=>markerText.toLowerCase().includes(x));
    const ecrKeys=payload?Object.keys(payload).slice(0,80):[];
    const meta={};for(const key of ["type","scoring","position","title","pageType","rankType","sport","year","week"]){if(payload&&key in payload)meta[key]=payload[key]}
    return new Response(JSON.stringify({ok:res.ok,status:res.status,finalUrl:res.url,contentType:res.headers.get("content-type"),bytes:text.length,title,h1,ecrDataFound:!!payload,ecrKeys,meta,playerRows:players.length,validRankingRows:rows.length,minRank:ranks.length?Math.min(...ranks):null,maxRank:ranks.length?Math.max(...ranks):null,missingRanks:missing.slice(0,50),duplicateRankCount:ranks.length-rankSet.size,duplicateNames,positions,first10:rows.slice(0,10),last10:rows.slice(-10),loginMarkers,publicFetchWithoutCookies:true},null,2),{headers:{"content-type":"application/json","cache-control":"no-store"}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.stack||e)},null,2),{status:500,headers:{"content-type":"application/json","cache-control":"no-store"}})}finally{clearTimeout(timer)}
};
