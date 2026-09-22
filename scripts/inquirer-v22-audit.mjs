import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {humanSectionsV22,parseMida} from '../netlify/functions/inquirer-context-v22.mjs';
export function auditV22(edition){
  assert.equal(edition.teams.length,32);
  assert.match(edition.league_overview.headline,/Weekly Recap/);
  for(const t of edition.teams){
    const s=t.inquirer_article.sections,body=s.flatMap(x=>x.paragraphs).join(' '),tradeBeat=s.filter(x=>x.kind==='trade-commentary');
    assert.ok(s.length===8||s.length===9,'Inquirer compatibility audit expects eight core beats plus at most one trade-commentary beat');
    assert.equal(s.length===9,tradeBeat.length===1,'A ninth section is valid only when it is the dedicated trade-commentary beat');
    for(const section of s){assert.ok(section.heading);assert.ok(section.paragraphs.length);assert.ok(section.paragraphs.every(p=>typeof p==='string'&&p.trim()))}
    assert.doesNotMatch(body,/leading trio|lead trio|next three names|next three contributors|taking the night off|truth-sized hole/);
    if(!t.value_history_week)assert.deepEqual(s.find(x=>x.kind==='value').paragraphs,['n/a']);
    if(!t.transactions.length)assert.deepEqual(s.find(x=>x.kind==='management').paragraphs,['n/a']);
    if(t.mida_outlook){
      const outlook=s.find(x=>x.kind==='outlook').paragraphs.join(' ');
      if(edition.inquirer_version>=24){
        assert.match(body,/playoff/i,'Article must preserve playoff context without requiring the same percentage in multiple sections');
        assert.match(outlook,/\b(?:next|forecast|schedule|gauntlet|expected|favou?red|underdog|road|assignment|opponent)\b/i,'Outlook must explain the next-game/schedule significance');
      }else assert.match(outlook,edition.inquirer_version>=23?/MIDA.*playoff chance/:/MIDA outlook.*playoffs.*championship.*division title/);
    }
    const top=t.starter_details.slice().sort((a,b)=>b.points-a.points).slice(0,3);
    const namedCoverage=(edition.inquirer_version>=25?s.filter(x=>x.kind==='lede'||x.kind==='players'):s.filter(x=>x.kind==='lede')).flatMap(x=>x.paragraphs||[]).join(' ');
    for(const p of top)assert.ok(namedCoverage.includes(p.name),'Leading players must be named naturally across the game/player reporting beats: '+p.name);
  }
  const parsed=parseMida('Data as of 2026-09-16\nTeam,Rank,Conf,Division,Exp Points,Exp Wins,Playoff %,Title %\nTest,1,AFC,East,1200,9,80,5');
  assert.equal(parsed[0].playoff,80);assert.equal(parsed[0].division,null);
  const t=structuredClone(edition.teams[0]);t.transactions=[{adds:['test-add'],drops:['test-drop']}];
  const report=humanSectionsV22({team:t,week:edition.week,reporter:t.inquirer_article.reporter,facts:{'test-add':{name:'Incoming',points:12,value:300},'test-drop':{name:'Outgoing',points:8,value:200}},sentiment:t.inquirer_article.fan_sentiment});
  assert.match(report.find(s=>s.kind==='management').paragraphs.join(' '),/net \+100.0/);
  const p=t.starter_details[0];p.points=40;p.projected=10;p.recent_form={series:[{week:1,points:10},{week:2,points:20},{week:3,points:12},{week:4,points:18}]};
  const historical=humanSectionsV22({team:t,week:5,reporter:t.inquirer_article.reporter,facts:{},sentiment:t.inquirer_article.fan_sentiment});
  assert.match(historical.find(s=>s.kind==='cool-throne').paragraphs.join(' '),/previous recorded games/);
  const ui=fs.readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
  assert.match(ui,/data-lh-broadcast-team="__league__"/);
  const scroll=ui.match(/function scrollToInquirerArticle\(\)\{[^\n]+/)[0];let selected='',top=null;
  vm.runInNewContext(scroll+';scrollToInquirerArticle()', {requestAnimationFrame:f=>f(),document:{querySelector:s=>{selected=s;return {getBoundingClientRect:()=>({top:250})}}},window:{scrollY:900,scrollTo:args=>{top=args.top}}});
  assert.match(selected,/lh-article-picker/);assert.equal(top,1040);
  assert.match(ui,/preserveY=view==='daily'&&previousView==='daily'/);
  console.log(JSON.stringify({ok:true,version:22,articles:edition.teams.length,mida_teams:edition.teams.filter(t=>t.mida_outlook).length}));
}
