import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectWeek5Readback} from '../scripts/inquirer-week5-readback-verification.mjs';
test('unpublished archive cannot be misrepresented as a completed Week5 release',async()=>{
 const reads=[];
 const store={get:async(key)=>{reads.push(key);return null},setJSON:()=>{throw Error('write forbidden')}};
 const result=await inspectWeek5Readback(store,'expected-reviewed-digest');
 assert.equal(result.ok,false);
 assert.ok(result.failures.includes('canonical-edition-not-verified'));
 assert.ok(result.failures.includes('approved-editorial-digest-does-not-match-stored-copy'));
 assert.ok(result.failures.includes('recap-is-not-exact-approved-copy'));
 assert.ok(result.failures.includes('weekly-awards-or-badges-incomplete'));
 assert.ok(result.failures.includes('manager-spotlight-cache-incomplete'));
 assert.equal(result.writes_performed,0);
 assert.ok(reads.includes('broadcasts/2026/week-05.json'));
});
test('storage exceptions remain explicit failures, never swallowed as success',async()=>{
 const result=await inspectWeek5Readback({get:async()=>{throw Error('Netlify storage unavailable')}},'digest');
 assert.equal(result.ok,false);
 assert.ok(result.failures.some(x=>x.startsWith('storage-unavailable:')));
});

import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
const makeCompleteStore=()=>{
 const ids=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
 const teams=Array.from({length:32},(_,i)=>({
  roster_id:String(i+1),points:100+i,opponent_points:90+i,won:true,
  team_name:'Team '+(i+1),inquirer_article:{
   headline:'Distinct headline '+(i+1),reporter:{id:ids[i%4]},
   sections:['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'].map(kind=>({kind,paragraphs:['Original Week 5 '+kind+' '+i]}))
  }
 }));
 const sections=[{blocks:['lead','standings','players','decisions','league','outlook'].map(kind=>({kind,paragraphs:['Specific '+kind]}))},
  {paragraphs:['reporter 2']},{paragraphs:['reporter 3']},{paragraphs:['reporter 4']}];
 const edition={available:true,season:2026,week:5,published_locked:true,inquirer_version:31,
  editorial_revision:40,editorial_generation:{engine:'v31-forward'},reporters:ids.map(id=>({id})),
  teams,league_overview:{headline:'Week 5 review',sections,hot_takes:[]}};
 const data=new Map([
  ['broadcasts/2026/week-05.json',edition],
  ['broadcasts/index.json',[{season:2026,week:5,key:'broadcasts/2026/week-05.json'}]],
  ['inquirer/league-overview/2026/week-05.json',{...edition.league_overview,published_locked:true}],
  ['awards/weekly.json',{records:[{season:2026,week:5,players_of_week:{offense:{player_id:'offense-1'},defense:{player_id:'defense-1'}},
   newsroom_editorial_revision:40,newsroom_engine:'v31-forward',manager_awards_generation_version:2,
   manager_awards:[{type:'highest-scorer',roster_id:'32'},{type:'lowest-scorer',roster_id:'1'},
    {type:'cool-throne',roster_id:'1'}]}]}],
  ['managers/history-cache.json',{current:teams.map(t=>({roster_id:t.roster_id,user_id:'user-'+t.roster_id})),
   career:teams.map(t=>({user_id:'user-'+t.roster_id})),scoring_history:{through_season:2026,through_week:5}}]
 ]);
 for(const id of ids){
  const matching=teams.filter(t=>t.inquirer_article.reporter.id===id);
  const articles=matching.map(t=>{
   const key='inquirer/reporters/'+id+'/articles/2026/week-05-roster-'+String(t.roster_id).padStart(2,'0')+'.json';
   data.set(key,{...t.inquirer_article,published_locked:true});
   return {season:2026,week:5,roster_id:t.roster_id,article_key:key};
  });
  data.set('inquirer/reporters/'+id+'/index.json',{articles});
 }
 return{edition,data,store:{get:async key=>data.get(key)??null,setJSON:()=>{throw Error('readback must not write')}}};
};
test('full positive readback proves the approved exact copy, 32 reporters, recap, awards and Spotlight are present',async()=>{
 const {edition,store}=makeCompleteStore();
 const result=await inspectWeek5Readback(store,editorialCopyDigest(edition));
 assert.equal(result.ok,true,JSON.stringify(result.failures));
 assert.equal(result.checked_reporter_articles,32);
 assert.equal(result.writes_performed,0);
});
test('complete archive is rejected when only the secondary recap or an article headline has drifted',async()=>{
 const {edition,data,store}=makeCompleteStore(),approved=editorialCopyDigest(edition);
 data.get('inquirer/league-overview/2026/week-05.json').headline='Wrong editorial recap title';
 let result=await inspectWeek5Readback(store,approved);
 assert.ok(result.failures.includes('recap-is-not-exact-approved-copy'));
 data.get('inquirer/league-overview/2026/week-05.json').headline=edition.league_overview.headline;
 const key='inquirer/reporters/walter-mercer/articles/2026/week-05-roster-01.json';
 data.get(key).headline='Altered published headline';
 result=await inspectWeek5Readback(store,approved);
 assert.ok(result.failures.some(x=>x.startsWith('reporter-article-does-not-match:')));
});

test('a complete archive fails readback if the separately saved weekly recap loses its lock or index',async()=>{
 const {edition,data,store}=makeCompleteStore(),approved=editorialCopyDigest(edition);
 data.get('inquirer/league-overview/2026/week-05.json').published_locked=false;
 let result=await inspectWeek5Readback(store,approved);
 assert.ok(result.failures.includes('recap-archive-unlocked'));
 data.get('inquirer/league-overview/2026/week-05.json').published_locked=true;
 data.set('broadcasts/index.json',[]);
 result=await inspectWeek5Readback(store,approved);
 assert.ok(result.failures.includes('canonical-broadcast-index-incomplete'));
});
