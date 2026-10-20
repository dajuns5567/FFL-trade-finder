import test from 'node:test';
import assert from 'node:assert/strict';
import {curateForwardTeamNarrative,restoreForwardArticleDepth,inspectNarrativeArchitecture} from '../netlify/functions/inquirer-narrative-architecture.mjs';

const makeStory=(i=1)=>{
 const t={roster_id:String(i),team_name:'Home Club '+i,opponent_name:'Away Club '+i,points:101+i,opponent_points:90,
  league_context:{record:{wins:3,losses:2}},best_lineup_miss:{gap:12,starter:{name:'Bench Target'},reserve:{name:'Bench Alternative'}},
  starter_details:[{name:'Top Runner',position:'RB',points:22,real_stats:{rush_att:16,rush_yd:92,rush_td:1,rec:4,rec_tgt:5,rec_yd:33}}],
  inquirer_article:{reporter:{id:['walter-mercer','tess-delaney','mack-hollis','nora-voss'][(i-1)%4]},sections:[
   {kind:'lede',heading:'The result',paragraphs:['A genuinely reported local opening.','The same score was recited mechanically.','The previous result had consequences.','The new score was recited again.','The same thing happened, apparently.']},
   {kind:'players',heading:'Players',paragraphs:[]},
   {kind:'management',heading:'Management',paragraphs:['Bench Target lost a legal lineup comparison to Bench Alternative.','Bench Target should have been replaced by Bench Alternative.','Next week Bench Target should lose the slot to Bench Alternative.']},
   {kind:'hot-seat',heading:'Hot seat',paragraphs:['A distinct weak-link analysis.']},
   {kind:'cool-throne',heading:'Credit',paragraphs:['Top Runner made the good part possible.']},
   {kind:'value',heading:'Value',paragraphs:[]},
   {kind:'sentiment',heading:'Fans',paragraphs:['The supporters have a specific response.','The reaction will last into the next week.']},
   {kind:'outlook',heading:'Next',paragraphs:['Away Club is next.','The schedule creates a second consequence.','The coming contest will answer the question.']}
  ]}
 };return t;
};

test('forward curation makes one result, one lineup argument, and real football prose',()=>{
 const t=curateForwardTeamNarrative(makeStory(),5),sections=t.inquirer_article.sections;
 assert.ok(sections.find(s=>s.kind==='lede').paragraphs.length<=3);
 assert.equal(sections.find(s=>s.kind==='management').paragraphs.length,1);
 const player=sections.find(s=>s.kind==='players').paragraphs[0];
 assert.match(player,/22\.0 fantasy points/);
 assert.match(player,/16 carries for 92 yards/);
 assert.doesNotMatch(player,/Against Away Club, Top Runner led/);
 assert.deepEqual(t.inquirer_article.paragraphs,sections.flatMap(s=>s.paragraphs));
});

test('edition gate detects a single template and repeated internal lineup reporting',()=>{
 const edition={week:5,teams:Array.from({length:32},(_,i)=>makeStory(i+1))};
 const ids=new Set(inspectNarrativeArchitecture(edition).map(issue=>issue.id));
 for(const id of ['overwritten-with-five-part-legacy-lede','repeated-management-case','same-lineup-decision-reported-twice','one-template-for-thirty-two-stories'])
  assert(ids.has(id),'missing editorial regression gate: '+id);
});

test('late editorial curation removes repeated decisions within one paragraph and fixes transaction syntax',()=>{
 const t=makeStory();
 t.inquirer_article.sections.find(s=>s.kind==='management').paragraphs=[
  'Bench Target lost 11.2 to Bench Alternative. Bench Target started at wr. Bench Alternative beat Bench Target by 11.2.',
  'The manager changed the roster this week by added Another Player. Those additions did not reach the Week 5 starters.'
 ];
 curateForwardTeamNarrative(t,5);
 const management=t.inquirer_article.sections.find(s=>s.kind==='management').paragraphs;
 assert.equal((management[0].match(/11\.2/g)||[]).length,1);
 assert.doesNotMatch(management.join(' '),/by added|Those additions did not reach|beat Bench Target/i);
 assert.match(management[1],/added Another Player/);
});

test('the admission gate detects repeated same-player comparisons inside one paragraph',()=>{
 const teams=Array.from({length:32},(_,i)=>curateForwardTeamNarrative(makeStory(i+1),5));
 teams[0].inquirer_article.sections.find(s=>s.kind==='management').paragraphs=[
  'Bench Target trailed Bench Alternative by 11.2. Bench Alternative beat Bench Target by 11.2.'
 ];
 const ids=inspectNarrativeArchitecture({week:5,teams}).map(x=>x.id);
 assert.ok(ids.includes('same-lineup-decision-twice-inside-paragraph'));
});

test('future-week player writing removes anonymous stock second-scorer prose and stale opening-week language',()=>{
 const t=makeStory();
 t.inquirer_article.sections.find(s=>s.kind==='lede').paragraphs[2]='The Home Club split the first two games. Week 3 gets to decide whether Week 2 was a bruise.';
 t.inquirer_article.sections.find(s=>s.kind==='players').paragraphs=[
  'Against Away Club, Top Runner led with 22.0 fantasy points.',
  'The star tight end kept the loss from becoming a simple story about one star. After a 7.7-point Week 4, the second scorer reached 15.2 and made this Sunday harder to mock.'
 ];
 curateForwardTeamNarrative(t,5);
 const p=t.inquirer_article.paragraphs.join(' ');
 assert.doesNotMatch(p,/split the first two games|second scorer reached|harder to mock|star tight end/i);
 assert.match(p,/Top Runner/);
});

test('editorial ordering is reporter- and outcome-sensitive across an issue',()=>{
 const teams=Array.from({length:32},(_,i)=>curateForwardTeamNarrative(makeStory(i+1),5));
 const orders=new Set(teams.map(t=>t.inquirer_article.sections.map(s=>s.kind).join('|')));
 assert.ok(orders.size>=3,'the complete edition may not use one shared section layout');
});

test('reordering sections cannot reintroduce canned editorial prefaces',()=>{
 const t=makeStory();
 t.inquirer_article.sections.find(s=>s.kind==='management').paragraphs[0]='Back-page material: The manager has to explain the lineup.';
 t.inquirer_article.sections.find(s=>s.kind==='hot-seat').paragraphs[0]='Back-page material: The weak starter cannot hide.';
 curateForwardTeamNarrative(t,5);
 const joined=t.inquirer_article.paragraphs.join(' ');
 assert.equal((joined.match(/Back-page material:/g)||[]).length,0);
});

test('a recap cannot smuggle a Week 2 season-record sentence into Week 5',()=>{
 const edition={week:5,teams:Array.from({length:32},(_,i)=>makeStory(i+1)),league_overview:{sections:[{paragraphs:['Cleveland Browns improved. The record is 2-0 after this result.']} ]}};
 assert.ok(inspectNarrativeArchitecture(edition).some(x=>x.id==='unattributed-or-stale-season-record'));
});


test('forward-week admission rejects malformed transplanted headlines and skeletal articles',()=>{
 const teams=Array.from({length:32},(_,i)=>curateForwardTeamNarrative(makeStory(i+1),5));
 teams[0].inquirer_article.headline='A this Sunday Worth Talking About for Home Club 1';
 const failures=inspectNarrativeArchitecture({week:5,teams});
 assert(failures.some(x=>x.id==='malformed-week-adapted-headline'&&x.team==='Home Club 1'));
 assert(failures.some(x=>x.id==='article-below-week4-editorial-floor'&&x.team==='Home Club 1'));
});

test('anonymous Week 2 praise is removed even when it survives in the credit desk',()=>{
 const t=makeStory();
 t.inquirer_article.sections.find(s=>s.kind==='cool-throne').paragraphs=[
  'Top Runner posted 22.0 points. After Week 4 the top rival target made this Sunday harder to mock. The result mattered for the standings.'
 ];
 curateForwardTeamNarrative(t,5);
 assert.doesNotMatch(t.inquirer_article.paragraphs.join(' '),/top rival target|harder to mock/i);
 assert.match(t.inquirer_article.paragraphs.join(' '),/result mattered for the standings/);
});


test('forward player desk keeps the verified second contributor even below 15 points',()=>{
 const t=makeStory();
 t.starter_details.push({name:'Reliable Receiver',position:'WR',points:12.3,real_stats:{rec:6,rec_tgt:8,rec_yd:84}});
 curateForwardTeamNarrative(t,5);
 const copy=t.inquirer_article.sections.find(s=>s.kind==='players').paragraphs.join(' ');
 assert.match(copy,/Top Runner/);
 assert.match(copy,/Reliable Receiver/);
 assert.match(copy,/12\.3 fantasy points/);
});


test('under-length team reporting adds a distinct verified reserve fact rather than fan boilerplate',()=>{
 const t=makeStory();
 t.starter_details.push(
  {name:'Reliable Receiver',position:'WR',points:12.3,real_stats:{rec:6,rec_tgt:8,rec_yd:84}},
  {name:'Young Tackler',position:'LB',points:7.5,real_stats:{tkl_solo:5,tkl_ast:3}}
 );
 curateForwardTeamNarrative(t,5);
 restoreForwardArticleDepth(t,5);
 const p=t.inquirer_article.sections.find(s=>s.kind==='players').paragraphs.join(' ');
 assert.match(p,/Young Tackler/);
 assert.match(p,/7\.5 fantasy points/);
 assert.match(p,/solo tackles/);
});


test('final composition names unnamed stat evidence and removes repeated two-game scaffold',()=>{
 const t=makeStory();
 t.starter_details.push({name:'Reliable Receiver',position:'WR',points:12.3,real_stats:{rec:6,rec_tgt:8,rec_yd:84}});
 curateForwardTeamNarrative(t,5);
 t.inquirer_article.sections.find(s=>s.kind==='players').paragraphs[1]='The play-by-play records 1 carries for 18 yards.';
 t.inquirer_article.sections.find(s=>s.kind==='hot-seat').paragraphs=['Reliable Receiver lost 9.6 points from Week 4, and Home Club 1 now has a two-game reason to inspect the role.'];
 restoreForwardArticleDepth(t,5);
 const copy=t.inquirer_article.paragraphs.join(' ');
 assert.match(copy,/Reliable Receiver supplied 12\.3 fantasy points/);
 assert.match(copy,/1 carry for 18 yards/);
 assert.doesNotMatch(copy,/two-game reason to inspect the role|1 carries/);
});


test('final newsroom restores empty Week 4 essential desks with verified performance facts',()=>{
 const t=makeStory();
 t.worst_starter={name:'Quiet Flex',points:2.0,projected:9.5,lineup_slot:'IDP_FLEX'};
 t.inquirer_article.sections.find(s=>s.kind==='hot-seat').paragraphs=[];
 t.inquirer_article.sections.find(s=>s.kind==='cool-throne').paragraphs=[];
 curateForwardTeamNarrative(t,5);
 restoreForwardArticleDepth(t,5);
 const hot=t.inquirer_article.sections.find(s=>s.kind==='hot-seat').paragraphs.join(' ');
 const cool=t.inquirer_article.sections.find(s=>s.kind==='cool-throne').paragraphs.join(' ');
 assert.match(hot,/Quiet Flex.*2\.0.*7\.5/);
 assert.match(cool,/Top Runner.*22\.0.*%/);
 const editions=Array.from({length:32},(_,i)=>curateForwardTeamNarrative(makeStory(i+1),5));
 editions[0].inquirer_article.sections.find(s=>s.kind==='hot-seat').paragraphs=[];
 assert(inspectNarrativeArchitecture({week:5,teams:editions}).some(x=>x.id==='week4-essential-desk-empty'));
});


test('late newsroom corrects plural-mascot possessives and admits no new malformed copy',()=>{
 const t=makeStory();t.team_name='Seattle Seahawks';
 t.inquirer_article.sections.find(s=>s.kind==='sentiment').paragraphs=["Seattle Seahawks's spectators expected a better showing."];
 curateForwardTeamNarrative(t,5);
 restoreForwardArticleDepth(t,5);
 assert.match(t.inquirer_article.paragraphs.join(' '),/Seattle Seahawks’ spectators/);
 assert.doesNotMatch(t.inquirer_article.paragraphs.join(' '),/Seahawks's/);
 const teams=Array.from({length:32},(_,i)=>curateForwardTeamNarrative(makeStory(i+1),5));
 teams[0].team_name='Seattle Seahawks';
 teams[0].inquirer_article.paragraphs.push("Seattle Seahawks's scorebook is here.");
 assert(inspectNarrativeArchitecture({week:5,teams}).some(x=>x.id==='plural-team-possessive'));
});


test('Week 5 recap gate refuses the stale first-impression arc',()=>{
 const teams=Array.from({length:32},(_,i)=>makeStory(i+1));
 const league_overview={sections:[{paragraphs:['Week 4 was a first impression; Week 5 was something else. Good starts have to survive a third opponent.']}]};
 assert(inspectNarrativeArchitecture({week:5,teams,league_overview}).some(x=>x.id==='stale-week2-recap-arc'));
});
