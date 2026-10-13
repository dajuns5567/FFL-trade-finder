import fs from 'node:fs';
import week4FastHandler from '../netlify/functions/league-hub-week4-fast.mjs';
const response=await week4FastHandler();
if(response.status!==200)throw Error('Week 4 fast route returned '+response.status);
const edition=await response.json();
if(edition.teams?.length!==32)throw Error('Expected exactly 32 finished Week 4 articles');
const data={season:edition.season,week:edition.week,recap:edition.league_overview,teams:edition.teams.map(t=>({team:t.team_name,roster_id:t.roster_id,points:t.points,opponent:t.opponent_name,opponent_points:t.opponent_points,starters:t.starter_details,article:t.inquirer_article}))};
fs.writeFileSync('/tmp/inquirer-week4-rendered-editorial.json',JSON.stringify(data,null,2));
console.log('EXPORTED_RENDERED_EDITORIAL '+JSON.stringify({teams:data.teams.length,recap:!!data.recap,bytes:fs.statSync('/tmp/inquirer-week4-rendered-editorial.json').size}));

const seen=new Set();
for(const t of data.teams){
 const id=t.article?.reporter?.id;
 if(!id||seen.has(id))continue;
 seen.add(id);
 const section=k=>t.article.sections?.find(s=>s.kind===k)?.paragraphs||[];
 console.log('EDITORIAL_SAMPLE '+JSON.stringify({reporter:id,team:t.team,headline:t.article.headline,lede:section('lede'),players:section('players'),management:section('management'),sentiment:section('sentiment'),outlook:section('outlook')}));
}
const stats=data.teams.map(t=>{
 const ps=(t.article?.sections||[]).filter(s=>['lede','players','management','hot-seat','cool-throne','sentiment','outlook'].includes(s.kind)).flatMap(s=>s.paragraphs||[]);
 return {team:t.team,words:ps.join(' ').split(/\s+/).filter(Boolean).length,paragraphs:ps.length,unique:new Set(ps).size};
});
console.log('EDITORIAL_QUALITY_COUNTS '+JSON.stringify(stats));
