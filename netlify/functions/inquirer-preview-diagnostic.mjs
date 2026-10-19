import {getDeployStore} from '@netlify/blobs';
import {isPreviewDiagnosticContext,PREVIEW_DIAGNOSTIC_STORE,PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION} from './lib/inquirer-preview-diagnostics.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}
});

// Newspaper-style reader is available ONLY on the isolated Deploy Preview.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const paragraphs=rows=>(rows||[]).map(p=>'<p>'+escapeHtml(p)+'</p>').join('');
// Nested recap blocks are the canonical editorial hierarchy. The flattened
// section.paragraphs array mirrors them for JSON consumers; do not print both.
export const renderSections=sections=>(sections||[]).map(section=>{
 const blocks=Array.isArray(section.blocks)&&section.blocks.length
  ?section.blocks.map(block=>'<div class="recap-block"><h4>'+escapeHtml(block.heading||'League report')+'</h4>'+paragraphs(block.paragraphs)+'</div>').join('')
  :paragraphs(section.paragraphs);
 return '<section><h3>'+escapeHtml(section.heading||section.kind||'News')+'</h3>'+blocks+'</section>';
}).join('');
function readableEdition(edition){
 const teams=(edition.teams||[]).slice().sort((a,b)=>String(a.team_name).localeCompare(String(b.team_name)));
 const articles=teams.map((t,i)=>{
  const article=t.inquirer_article||{};
  return '<details id="team-'+i+'"><summary><span>'+escapeHtml(t.team_name)+'</span><small>'+escapeHtml(article.headline||'')+'</small></summary>'+
   '<div class="story"><div class="byline">'+escapeHtml(article.byline||'')+'</div><h2>'+escapeHtml(article.headline||'')+'</h2>'+renderSections(article.sections)+'</div></details>';
 }).join('');
 const index=teams.map((t,i)=>'<a href="#team-'+i+'">'+escapeHtml(t.team_name)+'</a>').join('');
 const overview=edition.league_overview||{};
 const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fleeced! Inquirer — Week '+escapeHtml(edition.week)+'</title>'+
 '<style>html{scroll-behavior:smooth}body{margin:0;background:#f4f0e7;color:#24201d;font-family:Georgia,serif;line-height:1.72}header{background:#201d1a;color:#f9f2e5;padding:2.2rem 1rem;text-align:center}h1{font-size:clamp(2rem,5vw,3.5rem);letter-spacing:.05em;margin:.2rem 0}header p{margin:.25rem;color:#d6b47a}main{max-width:1040px;margin:auto;padding:1.4rem}nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.35rem;padding:1rem;background:white;border:1px solid #d7cfc2}nav a{color:#6d271c;text-decoration:none;padding:.25rem}nav a:hover{text-decoration:underline}.issue{background:#fffaf0;border-left:5px solid #8c271a;padding:1.4rem;margin:1.8rem 0}h2{font-size:1.8rem;line-height:1.2}h3{font-size:1.16rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #ccc;padding-bottom:.3rem}h4{font-size:1.12rem;line-height:1.3;margin:1.7rem 0 .6rem;color:#782f23}.recap-block{border-left:3px solid #d6b47a;padding-left:1.1rem;margin:1.4rem 0 2rem}section{margin:2rem 0}p{max-width:73ch}details{background:white;border:1px solid #d7cfc2;margin:.6rem 0;scroll-margin-top:1rem}summary{padding:1rem 1.3rem;cursor:pointer;display:flex;gap:.7rem;flex-direction:column;font-weight:bold}summary span{font-size:1.2rem}summary small{font:italic .9rem Georgia;color:#665d52}.story{padding:0 1.4rem 1.4rem}.byline{font:600 .8rem Arial,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:#805a35}.note{font: .8rem Arial,sans-serif;color:#b9a99a;margin-top:.7rem}</style></head><body><header><h1>FLEECED! INQUIRER</h1><p>Week '+escapeHtml(edition.week)+' • Private editorial preview</p><div class="note">Unpublished draft — not a live edition</div></header><main><h2>League desk</h2><article class="issue"><h2>'+escapeHtml(overview.headline||'Weekly Recap')+'</h2>'+renderSections(overview.sections)+'</article><h2>Team columns</h2><p>Choose a team below to open its full newspaper column.</p><nav>'+index+'</nav>'+articles+'</main></body></html>';
 return new Response(body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}});
}
export default async function inquirerPreviewDiagnostic(req){
 if(!isPreviewDiagnosticContext(req.url)||req.method!=='GET')return json({error:'Preview-only diagnostic'},403);
 const store=getDeployStore({name:PREVIEW_DIAGNOSTIC_STORE,consistency:'strong'});
 const status=await store.get(PREVIEW_DIAGNOSTIC_STATUS,{type:'json'}).catch(()=>null);
 if(new URL(req.url).searchParams.get('draft')==='1'){
  if(status?.state!=='completed')return json({status:status||{state:'not-started'},error:'Draft is not ready'},404);
  const edition=await store.get(PREVIEW_DIAGNOSTIC_EDITION,{type:'json'}).catch(()=>null);
  return edition?.preview_only===true&&edition?.published_locked===false
   ?(new URL(req.url).searchParams.get('view')==='readable'?readableEdition(edition):json(edition)):json({error:'Unpublished draft not found'},404);
 }
 return json({
  status:status||{state:'not-started'},
  start_url:'/.netlify/functions/inquirer-preview-background?start=1',
  draft_url:'/.netlify/functions/inquirer-preview-diagnostic?draft=1',
  storage:'isolated-per-deploy'
 });
}
