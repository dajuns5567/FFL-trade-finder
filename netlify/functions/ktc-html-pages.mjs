// Parse the player rankings KTC renders in its publicly accessible HTML.
// This is a separate source format from the asynchronous player-pool JSON.
// Never infer missing ranks or substitute 1QB/redraft/rookie values.
const OFFENSE=new Set(["QB","RB","WR","TE"]);
function decodeHtml(s){
 return String(s||"").replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{
  const val=n[0].toLowerCase()==="x"?parseInt(n.slice(1),16):parseInt(n,10);
  return Number.isInteger(val)&&val>=32&&val<=0x10ffff?String.fromCodePoint(val):" ";
 }).replace(/&(?:amp|apos|quot|nbsp|lt|gt);/gi,m=>({
  "&amp;":"&","&apos;":"'","&quot;":'"',"&nbsp;":" ","&lt;":"<","&gt;":">"
 })[m.toLowerCase()]||m).replace(/\s+/g," ").trim();
}
export function parseKtcRenderedPage(html){
 const doc=String(html||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
 // Never parse sidebar trends or player cards: only the rankings list.
 const region=doc.match(/<div\s+class=["']?[^"'<>]*["']?\s+id=["']rankings-page-rankings["'][^>]*>/i);
 if(!region)return [];
 const rest=doc.slice(region.index+region[0].length);
 const end=rest.indexOf('id="sidebar-insights"');
 const area=end>=0?rest.slice(0,end):rest;
 const chunks=area.split(/<div\s+class=["']onePlayer["'][^>]*>/i).slice(1);
 const rows=[];
 for(const part of chunks.slice(0,120)){
  const rankText=part.match(/class=["']rank-number["'][^>]*>\s*<p[^>]*>\s*(\d{1,4})\s*<\/p>/i)?.[1];
  const nameText=part.match(/class=["']player-name["'][^>]*>[\s\S]{0,700}?<a\b[^>]*>([^<]+)<\/a>/i)?.[1];
  const positionText=part.match(/class=["']position-team["'][^>]*>[\s\S]{0,250}?<p\s+class=["']position["'][^>]*>\s*([A-Za-z]{2,5})\d*\s*<\/p>/i)?.[1]?.toUpperCase();
  const valueText=part.match(/class=["']value["'][^>]*>\s*<p[^>]*>\s*([0-9,]+)\s*<\/p>/i)?.[1];
  const rank=Number(rankText),position=positionText||"",value=Number((valueText||"").replace(/,/g,""));
  const player=decodeHtml(nameText);
  if(!OFFENSE.has(position)||!player||!Number.isInteger(rank)||rank<1||rank>500||
     !Number.isFinite(value)||value<=0)continue;
  rows.push({rank,player,position,value});
 }
 return rows;
}
export function validateKtcRenderedPages(pages){
 const merged=(pages||[]).flatMap(parseKtcRenderedPage);
 const ranks=new Set(),names=new Set(),rankings=[];
 for(const row of merged.sort((a,b)=>a.rank-b.rank)){
  const name=row.player.toLowerCase().replace(/[^a-z0-9]/g,"");
  if(!name||ranks.has(row.rank)||names.has(name))return null;
  ranks.add(row.rank);names.add(name);rankings.push(row);
 }
 return rankings.length>=300?rankings:null;
}

export function deriveKtcSuperflexRanksFromPublishedValues(pages){
 const rows=(pages||[]).flatMap(parseKtcRenderedPage);
 const byName=new Map();
 for(const row of rows){
  const key=row.player.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  if(!key)return null;
  const earlier=byName.get(key);
  if(earlier){
   if(earlier.position!==row.position||earlier.value!==row.value)return null;
   continue;
  }
  byName.set(key,row);
 }
 if(byName.size<300)return null;
 const sorted=[...byName.values()].sort((a,b)=>b.value-a.value||a.player.localeCompare(b.player));
 return sorted.slice(0,500).map((row,i)=>({...row,rank:i+1,
  publishedPositionPageRank:row.rank}));
}
