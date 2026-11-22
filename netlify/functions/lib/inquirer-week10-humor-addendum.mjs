// Read-only newsroom tonal addendum for the already-published 2026 Week 10.
// The verified Git archive and its SHA-256 digest remain byte-for-byte intact.
// Nothing here claims a trade, a locker-room quote, or a result not in Sleeper.
import {verifiedTwoWeekForm} from './inquirer-verified-two-week-form.mjs';

// Read-only correction of a known Week 10 archive claim. This executes only
// after the archived issue has passed its immutable SHA-256 verification.
// If the underlying previous-week scores are missing, omit the sentence
// rather than asserting that zero teams won two games.
export function correctWeekTenConsecutiveWins(edition){
 if(Number(edition?.season)!==2026||Number(edition?.week)!==10||
    edition?.available!==true||edition?.published_locked!==true||
    !Array.isArray(edition?.teams)||edition.teams.length!==32)return edition;
 const statement='Nobody won both of the last two completed games. Apparently consistency has become an optional luxury.';
 const overview=edition?.league_overview;
 if(!overview?.sections?.some(s=>(s.paragraphs||[]).some(p=>String(p).includes(statement))))return edition;
 const verified=verifiedTwoWeekForm(edition.teams,10);
 const names=verified.winners.map(t=>String(t.team_name||'').trim()).filter(Boolean);
 const replacement=!verified.complete?'':names.length?
   'The teams that won both of the last two completed games are '+
   new Intl.ListFormat('en-US',{style:'long',type:'conjunction'}).format(names)+
   '. That is two verified wins, not an undefeated-season claim.':
   statement;
 const result=structuredClone(edition);
 const clean=paragraphs=>(paragraphs||[]).map(p=>String(p).replace(statement,replacement).trim()).filter(Boolean);
 for(const section of result.league_overview.sections||[]){
  if(section.blocks?.length){
   for(const block of section.blocks)block.paragraphs=clean(block.paragraphs);
   section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[]);
  }else section.paragraphs=clean(section.paragraphs);
 }
 result.league_overview.paragraphs=result.league_overview.sections.flatMap(s=>s.paragraphs||[]);
 result.reader_streak_correction={week:10,source:verified.complete?'verified Sleeper weekly scores':'unverified streak claim omitted',
   archive_original_unchanged:true};
 return result;
}
export function addWeekTenEditorialHumor(edition){
 if(edition?.reader_tonal_addendum?.week===10)return edition;
 if(Number(edition?.season)!==2026||Number(edition?.week)!==10||
    edition?.available!==true||edition?.published_locked!==true||
    edition?.editorial_generation?.engine!=='v31-forward'||
    !Array.isArray(edition.teams)||edition.teams.length!==32)return edition;
 const result=structuredClone(correctWeekTenConsecutiveWins(edition)),used=new Set();
 for(const team of result.teams){
  const article=team?.inquirer_article,desk=article?.sections?.find(x=>x.kind==='sentiment');
  const roster=Number(team?.roster_id),club=String(team?.team_name||'').trim(),
    foe=String(team?.opponent_name||'').trim();
  const score=Number(team?.points),allowed=Number(team?.opponent_points);
  const weak=(team?.starter_details||[]).filter(p=>p?.name&&p.points!=null&&Number.isFinite(Number(p.points)))
   .sort((a,b)=>Number(a.points)-Number(b.points))[0];
  if(!Number.isInteger(roster)||!desk?.paragraphs?.length||!club||!foe||
     !Number.isFinite(score)||!Number.isFinite(allowed)||!weak)continue;
  const name=String(weak.name),low=Number(weak.points).toFixed(1),sum=score.toFixed(1),
   voice=String(article.reporter?.id||'walter-mercer');
  const lines={
   'walter-mercer':[
    name+' supplied '+low+' points for '+club+' against '+foe+'. The final tally was '+sum+', and the manager can file any objections with the calculator, which has declined comment.',
    club+' received '+low+' from '+name+'. A '+sum+'-point result does not require an imaginative explanation; it requires management to acknowledge the starting card.',
    'The official '+club+' box score listed '+name+' at '+low+'. '+foe+' was on the other sideline, not the editorial board, so the numbers stand.',
    'For '+club+', the '+low+' from '+name+' is the kind of statistic a press officer would prefer to submit in very small print. The '+sum+' total will not cooperate.',
    club+' finished with '+sum+' against '+foe+' while '+name+' contributed '+low+'. The evidence is less charitable than any pregame forecast.',
    'Management can describe '+club+'’s '+sum+' however it chooses. The '+low+' recorded by '+name+' does not improve with a better adjective.',
    name+' delivered '+low+' to '+club+' against '+foe+'. A courtroom would call that an exhibit; the manager can decide whether to ask for a recess.',
    'The '+club+' scorer’s ledger shows '+low+' next to '+name+'. The '+sum+' team total has been entered into evidence and cannot be edited by the defense.'
   ],
   'tess-delaney':[
    club+' dressed '+name+' for the starting lineup and got '+low+'. The '+sum+'-point outfit against '+foe+' did not come with a receipt for store credit.',
    'On the '+club+' runway, '+name+'’s '+low+' was the accessory nobody should have paired with a '+sum+'-point Sunday. '+foe+' kept the scorecard.',
    'The '+club+' ensemble featured '+name+' at '+low+'. Calling it fashion-forward will not make the fantasy total any larger.',
    'Against '+foe+', the '+club+' look finished on '+sum+'. '+name+' supplied '+low+', which is less a bold choice than a very expensive fitting.',
    club+' put '+name+' in the spotlight for '+low+' points. The '+sum+' team score arrived without a flattering camera angle.',
    name+' contributed '+low+' to '+club+'. That starting-slot selection deserved a second look long before '+foe+' handed in the final score.',
    'The '+club+' lineup featured '+name+' and '+low+' points. The stylist may call it minimalism; the fantasy scoreboard calls it exactly what it is.',
    'A '+sum+' for '+club+' against '+foe+' cannot hide '+name+' at '+low+'. It is the seam everybody noticed after the show.'
   ],
   'mack-hollis':[
    name+' produced '+low+' for '+club+'. If that was the plan against '+foe+', the plan should apologize before the manager does.',
    club+' got '+low+' from '+name+' and ended at '+sum+'. That is not a secret strategy. That is a starting lineup with a confession attached.',
    'Somebody selected '+name+' for '+club+' and received '+low+'. '+foe+' did not need a better game plan; the scoreboard was already doing the work.',
    'The '+club+' number was '+sum+' against '+foe+'. '+name+' supplied '+low+'. Spare everybody the motivational poster and address the actual score.',
    name+' put '+low+' on the '+club+' board. Calling it a calculated gamble is unfair to calculators everywhere.',
    'At '+low+' from '+name+', '+club+' had a problem '+foe+' could spot without a scouting report. The '+sum+' total cannot talk its way out of that.',
    club+' scored '+sum+' with '+name+' contributing '+low+'. There is no award for explaining away a number that small.',
    name+' contributed '+low+' against '+foe+'. '+club+' can argue about the result, but the starting slot has already been cross-examined.'
   ],
   'nora-voss':[
    'Imagine the '+club+' group-chat reaction to '+name+' at '+low+'. The '+sum+' against '+foe+' is the screenshot nobody wants framed.',
    club+' logged '+low+' from '+name+'. If '+foe+' needed a punchline, the starting card has already written one.',
    'The most discussable '+club+' number is '+name+' at '+low+'. Even a gossip column cannot embellish a score that is already this loud.',
    'Somewhere in an imaginary '+club+' rumor mill, '+name+' at '+low+' has become the headline. The '+foe+' result supplied the punctuation.',
    'The '+club+' scandal of the afternoon is '+name+' at '+low+'. Calling it nuance will not fool anyone who saw the '+sum+' total.',
    'If the '+club+' fans want a villain, '+name+' posting '+low+' is the obvious casting choice. The score against '+foe+' is not a screenplay.',
    'The '+club+' starting sheet gave '+name+' '+low+' points. That is enough gossip for a week, and not one word needs to be invented.',
    club+' arrived with '+sum+' against '+foe+' and '+name+' at '+low+'. No imaginary insider is needed; the evidence was published on the scoreboard.'
   ]
  };
  const options=lines[voice]||lines['walter-mercer'];
  let index=((Math.floor((roster-1)/4)+10)%options.length+options.length)%options.length;
  for(let attempt=0;attempt<options.length&&used.has(voice+'|'+index);attempt++)index=(index+1)%options.length;
  if(used.has(voice+'|'+index))continue;
  used.add(voice+'|'+index);
  const sentence=options[index];
  if(desk.paragraphs.some(p=>String(p).includes(sentence)))continue;
  desk.paragraphs.push(sentence);
  article.paragraphs=article.sections.flatMap(s=>s.paragraphs||[]);
 }
 result.reader_tonal_addendum={week:10,source:'verified Sleeper matchup/starter facts',archive_original_unchanged:true};
 return result;
}
