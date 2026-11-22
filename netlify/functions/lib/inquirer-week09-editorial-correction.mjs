// Read-only correction of the specific 2026 Week 9 revision-109 newspaper.
// Never overwrite the original SHA-256-verified archive or an existing Blob.
// No replacement is displayed if the original bytes or recorded facts change.
import {createHash} from 'node:crypto';
export const ORIGINAL_SHA='8b55ac2296147d0cb3011bc8a0c2bf57169a41a14ea83a8f889655850512a2a8';
export const CORRECTION_ID='2026-week09-attributed-recap-r1';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const n=v=>Number(v).toFixed(1);
const named=(t,p)=>[t.team_name,t.opponent_name,t.next_opponent_name,t.manager_name,
 ...(t.starter_details||[]).map(x=>x.name)].filter(Boolean).some(name=>String(p).toLowerCase().includes(String(name).toLowerCase()));
function find(d,name,opponent){
 const t=d.teams.find(x=>x.team_name===name&&x.opponent_name===opponent);
 if(!t||!Number.isFinite(Number(t.points))||!Number.isFinite(Number(t.opponent_points)))
  throw Error('Original matchup unavailable for '+name);
 return t;
}
function starter(t,name,points){
 const p=(t.starter_details||[]).find(x=>x.name===name&&Math.abs(Number(x.points)-points)<.051);
 if(!p)throw Error('Unverified source player stat '+t.team_name+':'+name);
 return p;
}
const leading=t=>(t.starter_details||[]).filter(x=>x.name&&Number.isFinite(Number(x.points)))
 .sort((a,b)=>Number(b.points)-Number(a.points))[0];
function teamFix(t,kind){
 const p=leading(t),score=n(t.points)+'–'+n(t.opponent_points),won=t.won?'beat':'fell to';
 if(!p||!t.next_opponent_name)return null;
 const reporter=t.reporter_id||'',team=t.team_name,opponent=t.opponent_name;
 const voice=reporter==='walter-mercer'?0:reporter==='tess-delaney'?1:reporter==='mack-hollis'?2:3;
 const opening=[
  team+' '+won+' '+opponent+' '+score+'. The final is on the books; '+p.name+' supplied '+n(p.points)+' points of the evidence.',
  team+' '+won+' '+opponent+' '+score+', a Sunday argument that '+p.name+' helped shape with '+n(p.points)+' points. One suspects the neighbors have already formed opinions.',
  team+' '+won+' '+opponent+' '+score+'. '+p.name+': '+n(p.points)+' points. Put that name on the back page.',
  team+' '+won+' '+opponent+' '+score+'. Exhibit A is '+p.name+' and '+n(p.points)+' points; the rest of the case is the lineup.'
 ];
 if(kind==='lede')return opening[voice];
 if(kind==='cool-throne')return [
  p.name+' earned his space in the clipping: '+n(p.points)+' points as '+team+' finished '+score+' against '+opponent+'.',
  'A tip of the hat to '+p.name+'. His '+n(p.points)+' points gave '+team+' something worth framing, regardless of the '+score+' final.',
  p.name+' delivered '+n(p.points)+' points against '+opponent+'. The rest of the card can argue over the '+score+' result.',
  p.name+' logged '+n(p.points)+' points for '+team+' against '+opponent+'. That contribution is not in dispute.'
 ][voice];
 if(kind==='outlook')return [
  team+' gets '+t.next_opponent_name+' next. After '+score+' against '+opponent+', there is no shortage of work.',
  'Next on the invitation list: '+t.next_opponent_name+'. '+team+' carries a '+score+' result into that engagement.',
  'NEXT UP: '+t.next_opponent_name+'. '+team+' takes the '+score+' result and all its consequences into Week 10.',
  team+' faces '+t.next_opponent_name+' in Week 10. The '+score+' against '+opponent+' remains the case file.'
 ][voice];
 if(kind==='sentiment')return [
  'Manager '+t.manager_name+' owns the '+score+' result against '+opponent+'. '+p.name+' gave the lineup '+n(p.points)+' points, a detail not to be forgotten.',
  'For manager '+t.manager_name+', the '+score+' against '+opponent+' will linger. '+p.name+' contributed '+n(p.points)+' points to the occasion.',
  'Manager '+t.manager_name+' has a '+score+' result to answer for or celebrate. '+p.name+' brought '+n(p.points)+' points to the party.',
  'The score under manager '+t.manager_name+' reads '+score+' against '+opponent+'. '+p.name+' accounted for '+n(p.points)+' points; the evidence is signed.'
 ][voice];
 if(kind==='management')return [
  'Manager '+t.manager_name+' sent out the '+team+' lineup for '+n(t.points)+' points against '+opponent+'. '+p.name+' accounted for '+n(p.points)+' of them.',
  'Manager '+t.manager_name+' presented a '+team+' lineup worth '+n(t.points)+' against '+opponent+', with '+n(p.points)+' supplied by '+p.name+'.',
  'THE LINEUP CARD: '+n(t.points)+' for '+team+' against '+opponent+'. Manager '+t.manager_name+' got '+n(p.points)+' from '+p.name+'.',
  'Manager '+t.manager_name+' signed the '+team+' lineup that scored '+n(t.points)+' against '+opponent+'. '+p.name+' produced '+n(p.points)+'; the rest is still under review.'
 ][voice];
 return null;
}
function correctTeamArticles(d){
 let changed=0;
 for(const t of d.teams){
  const article=t.inquirer_article;if(!article?.sections?.length)throw Error('Missing complete original team article');
  for(const section of article.sections){
   section.paragraphs=(section.paragraphs||[]).map(p=>{
    if(p.length>165||named(t,p))return p;
    const fixed=teamFix(t,section.kind);
    if(!fixed)return p;
    changed++;return fixed;
   });
  }
  article.paragraphs=article.sections.flatMap(x=>x.paragraphs||[]);
 }
 return changed;
}
function correctRecap(d){
 const jets=find(d,'New York Jets','New England Patriots'),
  patriots=find(d,'New England Patriots','New York Jets'),
  chargers=find(d,'Los Angeles Chargers','Las Vegas Raiders'),
  raiders=find(d,'Las Vegas Raiders','Los Angeles Chargers'),
  doncos=find(d,'Denver Doncos','Kansas City Chiefs'),
  chiefs=find(d,'Kansas City Chiefs','Denver Doncos'),
  bungals=find(d,'Cincinnati Bungals','Baltimore Ravens'),
  buffalo=find(d,'Buffalo Billiards','Miami Dolphins');
 starter(jets,'Tykee Smith',25.3);
 starter(chargers,'Arvell Reese',48.8);starter(chargers,'C.J. Stroud',33.76);
 starter(doncos,'Javonte Williams',22.4);
 const patMiss=patriots.best_lineup_miss,bunMiss=bungals.best_lineup_miss;
 if(patMiss?.starter?.name!=='Zach Allen'||patMiss?.reserve?.name!=='Daiyan Henley'||
    Math.abs(Number(patMiss.gap)-22.3)>.051||
    bunMiss?.starter?.name!=='Boye Mafe'||bunMiss?.reserve?.name!=='Myles Garrett'||
    Math.abs(Number(bunMiss.gap)-39.1)>.051)
  throw Error('Original Week 9 bench facts do not match the reviewed correction');
 const overview=d.league_overview,feature=overview?.sections?.[0],blocks=feature?.blocks;
 if(!Array.isArray(blocks)||blocks.map(b=>b.kind).join(',')!=='lead,standings,players,decisions,league,outlook')
  throw Error('Original Week 9 recap has changed; correction held');
 feature.heading='Week 9: The Jets Make Their Point, the Chargers Make a Scene';
 blocks[0].heading='The Jets Turn the Table on New England';
 blocks[0].paragraphs=[
  'New York Jets had been through enough already. Then came an '+n(jets.points)+'–'+n(patriots.points)+' win over New England Patriots, with manager '+jets.manager_name+' handing manager '+patriots.manager_name+' a '+n(jets.points-patriots.points)+'-point defeat that nobody on the Patriots sideline will enjoy revisiting. A 4-5 club had just found its favorite Sunday of the month.',
  'The sting for New England was hiding on its own bench. Zach Allen started in the IDP FLEX spot for '+n(patMiss.starter.points)+'; Daiyan Henley scored '+n(patMiss.reserve.points)+' in reserve. The '+n(patMiss.gap)+'-point gap was bigger than the final margin. No need for a conspiracy board when the lineup card is this unkind.',
  'A week earlier, the Jets had fallen to Arizona Cardinals. This time they added 21.5 points to their previous total, with Tykee Smith contributing '+n(25.3)+'. Whatever the Jets had been saying about turning the corner, at least this time the scoreboard answered.'
 ];
 blocks[1].heading='The Race Tightens, Even at the Top';
 blocks[1].paragraphs=[
  'The Jets moved to 4-5 while New England slipped to 7-2. That upset will not knock the Patriots out of the race, but it gives their next lineup meeting an uncomfortable opening question: how did a '+n(patMiss.gap)+'-point bench advantage stay on the sideline in a '+n(jets.points-patriots.points)+'-point loss?',
  'Denver Doncos kept their hands on first place, beating Kansas City Chiefs '+n(doncos.points)+'–'+n(chiefs.points)+'. Javonte Williams chipped in '+n(22.4)+' for Denver. The leaders keep winning; everyone else keeps checking the standings, which is hardly a restful way to spend November.'
 ];
 blocks[2].heading='The Back Page Belongs to the Chargers';
 blocks[2].paragraphs=[
  'Los Angeles Chargers did not bother making the Raiders game suspenseful. Manager '+chargers.manager_name+' watched a '+n(chargers.points)+'–'+n(raiders.points)+' rout of Las Vegas Raiders, powered by Arvell Reese and a defensive performance worth '+n(48.8)+' fantasy points. Ten solo tackles, three sacks and three quarterback hits: that is not a cameo, it is a full-page advertisement.',
  'C.J. Stroud added '+n(33.76)+' for Los Angeles. Together, Stroud and Reese brought '+n(48.8+33.76)+' points to a lineup that had plenty of room to celebrate. Somewhere in the league, another manager looked at that total and quietly shut the laptop.',
  'Tykee Smith deserves a line here too. His '+n(25.3)+' for the Jets provided a sizable share of the upset over New England, the kind of defensive output managers remember the next time an IDP slot looks like an afterthought.'
 ];
 blocks[3].heading='The Lineup Decisions That Will Linger';
 blocks[3].paragraphs=[
  'Cincinnati Bungals manager '+bungals.manager_name+' started Boye Mafe ('+n(bunMiss.starter.points)+') with eligible reserve Myles Garrett ('+n(bunMiss.reserve.points)+') on the bench. That is a '+n(bunMiss.gap)+'-point difference in a '+n(bungals.points)+'–'+n(bungals.opponent_points)+' loss to Baltimore Ravens. The lineup did not create every problem in Cincinnati, but it certainly volunteered to be questioned first.',
  'New England has a smaller margin and its own painfully larger alternative: Henley over Allen offered '+n(patMiss.gap)+' more. The Jets earned their '+n(jets.points)+'–'+n(patriots.points)+' result; the Patriots are left wondering why they made earning it quite so manageable.'
 ];
 blocks[4].heading='The High, the Low, and the Distance Between';
 blocks[4].paragraphs=[
  'The Chargers topped the Week 9 scoring sheet with '+n(chargers.points)+' against the Raiders, and Reese supplied '+n(48.8)+' of those points. A performance like that travels quickly through a 32-team league. So does the sight of the opposite end of the table.',
  'Kansas City Chiefs managed '+n(chiefs.points)+' against the Doncos, whose '+n(doncos.points)+' did not require much suspense. The gulf between the Chargers and Chiefs reached '+n(chargers.points-chiefs.points)+' points. Nobody is suggesting those clubs faced each other this week; the scoreboard comparison alone is enough to make Kansas City reach for the aspirin.'
 ];
 blocks[5].heading='Next Sunday Is Already Asking Questions';
 blocks[5].paragraphs=[
  'New York Jets draw Jacksonville Jags next. Smith and his '+n(25.3)+'-point contribution are reasons for optimism, but the '+n(jets.points)+'–'+n(patriots.points)+' upset becomes a turning point only if the Jets can carry something from it into Week 10.',
  'Los Angeles Chargers face Pittsburgh Steelers after their '+n(chargers.points)+'-point outburst. Buffalo Billiards, beaten '+n(buffalo.points)+'–'+n(buffalo.opponent_points)+' by Miami Dolphins, have Tennessee Titans waiting. One week makes a wonderful headline. The next decides whether it was news or merely a very loud afternoon.'
 ];
 feature.paragraphs=blocks.flatMap(b=>b.paragraphs||[]);
 const race=overview.sections?.[1],back=overview.sections?.[3],next=overview.sections?.[4];
 if(!race||!back||!next)throw Error('Original recap supplementary sections missing');
 race.heading='Playoff Picture: Denver Leads, Patriots Hold Fourth';
 race.paragraphs=[
  'Denver Doncos stood first in the Week 9 fantasy standings after beating Kansas City Chiefs '+n(doncos.points)+'–'+n(chiefs.points)+'. New England Patriots held No. 4 despite losing by '+n(jets.points-patriots.points)+' to New York Jets.',
  'Four regular-season weeks remained before the Week 14 Wildcard Round. New England Patriots were 7-2 at the conference cut line while Denver Doncos led the league.'
 ];
 // The original first back-page paragraph did not identify the teams in
 // its transaction report. Drop only that unsupported attribution: the seven
 // verified, named trade and matchup reports remain intact.
 if(back.paragraphs?.[0]?.startsWith('The moves worth keeping on the back page:'))
  back.paragraphs=back.paragraphs.slice(1);
 next.paragraphs=[
  'New York Jets beat New England Patriots '+n(jets.points)+'–'+n(patriots.points)+'. Patriots manager '+patriots.manager_name+' faces the concrete '+n(patMiss.gap)+'-point Henley/Allen IDP FLEX question.',
  'Los Angeles Chargers scored '+n(chargers.points)+' against Las Vegas Raiders. Arvell Reese supplied '+n(48.8)+' and C.J. Stroud added '+n(33.76)+' for Chargers manager '+chargers.manager_name+'.',
  'Jacksonville Jags next play New York Jets, while Pittsburgh Steelers play Los Angeles Chargers. These are the next two actual fantasy matchups, not interchangeable NFL-team prose.'
 ];
 overview.paragraphs=overview.sections.flatMap(s=>s.paragraphs||[]);
 overview.deck='New York Jets beat New England Patriots '+n(jets.points)+'–'+n(patriots.points)+'; Los Angeles Chargers overwhelmed Las Vegas Raiders '+n(chargers.points)+'–'+n(raiders.points)+'. The fantasy managers, starters and specific lineup decisions explain Week 9.';
}
export function correctWeekNineReaderEdition(original){
 if(!original||Number(original.season)!==2026||Number(original.week)!==9||
    Number(original.editorial_revision)!==109||hash(original)!==ORIGINAL_SHA)return original;
 const output=structuredClone(original);
 correctRecap(output);
 const teamParagraphs=correctTeamArticles(output);
 output.reader_editorial_correction={
  id:CORRECTION_ID,source_sha256:ORIGINAL_SHA,original_editorial_revision:109,
  presentation_only:true,original_archive_unchanged:true,
  corrected_team_paragraph_count:teamParagraphs,
  note:'Fact-grounded reader correction; this is not a second recovered original manuscript.'
 };
 return output;
}
