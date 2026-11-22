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
 const p=leading(t),score=n(t.points)+'–'+n(t.opponent_points),won=t.won?'beat':'lost to';
 if(!p||!t.next_opponent_name)return null;
 if(kind==='lede')return t.team_name+' '+won+' '+t.opponent_name+' '+score+' in Week 9. '+p.name+' contributed '+n(p.points)+' fantasy points to '+t.team_name+' in that matchup.';
 if(kind==='cool-throne')return p.name+' gave '+t.team_name+' '+n(p.points)+' points against '+t.opponent_name+' in Week 9. '+t.team_name+' finished '+score+'.';
 if(kind==='outlook')return t.team_name+' faces '+t.next_opponent_name+' in Week 10 after the '+score+' Week 9 result against '+t.opponent_name+'.';
 if(kind==='sentiment')return t.team_name+' manager '+t.manager_name+' has the '+score+' Week 9 result against '+t.opponent_name+' to explain. '+p.name+' delivered '+n(p.points)+' of those points.';
 if(kind==='management')return t.team_name+' manager '+t.manager_name+' set the lineup that scored '+n(t.points)+' against '+t.opponent_name+' in Week 9; '+p.name+' added '+n(p.points)+'.';
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
 feature.heading='Week 9: Jets Stun Patriots; Chargers Rout Raiders';
 blocks[0].heading='The Jets-Patriots Upset, With Names Attached';
 blocks[0].paragraphs=[
  'New York Jets (manager '+jets.manager_name+') beat New England Patriots (manager '+patriots.manager_name+') '+n(jets.points)+'–'+n(patriots.points)+' in the FLEECED! Week 9 fantasy matchup. The '+n(jets.points-patriots.points)+'-point finish was a fantasy-lineup upset, not a result between NFL franchises.',
  'New England Patriots started Zach Allen for '+n(patMiss.starter.points)+' in the IDP FLEX slot and left Daiyan Henley on the bench with '+n(patMiss.reserve.points)+'. The '+n(patMiss.gap)+'-point difference exceeded New England’s losing margin; this is a manager '+patriots.manager_name+' lineup decision, not a mystery about the final.',
  'New York Jets produced '+n(jets.points)+' points after losing to Arizona Cardinals in Week 8. Their Week 9 lineup added 21.5 to the previous total, and Tykee Smith supplied '+n(25.3)+' of the new Week 9 score.'
 ];
 blocks[1].paragraphs=[
  'The New York Jets win over New England Patriots, '+n(jets.points)+'–'+n(patriots.points)+', moved the Jets to 4-5 while the Patriots fell to 7-2. The result affected two fantasy managers, '+jets.manager_name+' and '+patriots.manager_name+', not the NFL standings.',
  'Denver Doncos (manager '+doncos.manager_name+') held No. 1 in the FLEECED! table after beating Kansas City Chiefs '+n(doncos.points)+'–'+n(chiefs.points)+'. Javonte Williams accounted for '+n(22.4)+' points in the Doncos starting lineup.'
 ];
 blocks[2].paragraphs=[
  'Los Angeles Chargers (manager '+chargers.manager_name+') beat Las Vegas Raiders '+n(chargers.points)+'–'+n(raiders.points)+'. Chargers linebacker Arvell Reese scored '+n(48.8)+' fantasy points with 10 solo tackles, three sacks and three quarterback hits.',
  'C.J. Stroud scored '+n(33.76)+' more for Los Angeles Chargers. He and Arvell Reese combined for '+n(48.8+33.76)+' of the Chargers’ '+n(chargers.points)+' fantasy points against Las Vegas Raiders.',
  'New York Jets defensive back Tykee Smith scored '+n(25.3)+' fantasy points in the '+n(jets.points-patriots.points)+'-point win over New England Patriots.',
  'New England Patriots could have used Daiyan Henley ('+n(patMiss.reserve.points)+') instead of Zach Allen ('+n(patMiss.starter.points)+') in the eligible IDP FLEX slot. The unused '+n(patMiss.gap)+' points matter to that specific matchup.'
 ];
 blocks[3].paragraphs=[
  'Cincinnati Bungals (manager '+bungals.manager_name+') started Boye Mafe ('+n(bunMiss.starter.points)+') rather than eligible bench defender Myles Garrett ('+n(bunMiss.reserve.points)+'). The '+n(bunMiss.gap)+'-point difference accompanied a '+n(bungals.points)+'–'+n(bungals.opponent_points)+' loss to Baltimore Ravens.',
  'New England Patriots manager '+patriots.manager_name+' left '+n(patMiss.gap)+' possible IDP points on the bench in the Henley-versus-Allen decision. New York Jets still had to earn the '+n(jets.points)+'–'+n(patriots.points)+' final.'
 ];
 blocks[4].paragraphs=[
  'Los Angeles Chargers led Week 9 fantasy scoring with '+n(chargers.points)+' points against Las Vegas Raiders ('+n(raiders.points)+'). Arvell Reese delivered '+n(48.8)+' for the Chargers.',
  'Kansas City Chiefs scored '+n(chiefs.points)+' against Denver Doncos ('+n(doncos.points)+'). The '+n(chargers.points-chiefs.points)+'-point span between the Chargers and Chiefs is a comparison of league lineup totals, not a head-to-head matchup.'
 ];
 blocks[5].paragraphs=[
  'New York Jets next play Jacksonville Jags after their '+n(jets.points)+'–'+n(patriots.points)+' win over New England Patriots. Tykee Smith’s '+n(25.3)+' points are part of the Week 9 evidence their manager takes into Week 10.',
  'Los Angeles Chargers next face Pittsburgh Steelers after the '+n(chargers.points)+'-point win over Las Vegas Raiders. Buffalo Billiards, after losing '+n(buffalo.points)+'–'+n(buffalo.opponent_points)+' to Miami Dolphins, next face Tennessee Titans.'
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
