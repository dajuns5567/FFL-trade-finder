'use strict';

import {humanSectionsV19} from './inquirer-human-v19.mjs';

const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(rows,seed)=>rows[Math.abs(Number(seed)||0)%rows.length];
const one=v=>Number(v||0).toFixed(1);
const voiceId=r=>r?.id==='walter-mercer'?'nick':r?.id==='tess-delaney'?'bart':r?.id==='mack-hollis'?'tilly':'jeff';
const articleSeed=(t,w)=>hash(String(t?.roster_id||t?.team_name||'team')+'|'+String(w||1)+'|v20');

function storyAngle(t){
  const c=t?.league_context||{},st=c.streak||{},miss=t?.best_lineup_miss,margin=Number(t?.points)-Number(t?.opponent_points);
  if(t?.current_season_champion)return'champion';
  if(t?.week_classification?.playoffs)return margin>=0?'playoff-win':'playoff-loss';
  if(miss?.reserve&&miss?.starter&&Number(miss.gap)>=8)return'lineup';
  if(Math.abs(margin)>=30)return margin>0?'rout-win':'rout-loss';
  if(Math.abs(margin)<=6)return margin>0?'close-win':'close-loss';
  if(Number(st.length)>=3)return st.type==='W'?'heater':'spiral';
  if((t?.transactions||[]).length>=8)return'front-office';
  return margin>=0?'win':'loss';
}

function newsroomInsight(t,voice,seed){
  const angle=storyAngle(t),team=t.team_name||'this team',opp=t.opponent_name||'the opponent',miss=t.best_lineup_miss;
  const rows={
    champion:{
      nick:['I have spent all season rationing optimism like it was wartime sugar. Forget that. '+team+' won the whole thing, and this clipping is going somewhere my family will eventually ask me to take down.'],
      bart:['There are moments for restraint, and then there are championships. '+team+' has won the whole vulgar, beautiful thing; somebody find the expensive glassware and hide my earlier reservations.'],
      tilly:['THEY WON THE WHOLE THING. Fine, legal department, I will use indoor punctuation: '+team+' is champion, the presses are overheating, and I have no intention of behaving professionally before breakfast.'],
      jeff:['I have closed enough files on bad Sundays to recognize the rare perfect ending. '+team+' is champion. Case closed, evidence overwhelming, cynicism temporarily suspended for celebration.']
    },
    'playoff-win':{
      nick:['January rules apply now: survive first, explain later. '+team+' is still alive, which means every complaint in this notebook has been granted at least one more Sunday to become irrelevant.'],
      bart:['The postseason has no interest in our aesthetic standards. '+team+' survived, which is tasteless, magnificent and the only review that matters tonight.'],
      tilly:['Playoff win! Nobody ask whether it was pretty. Pretty is for invitations; surviving is for headlines, and '+team+' still has one to write.'],
      jeff:['The postseason file stays open because '+team+' advanced. That is the only exhibit with binding authority tonight.']
    },
    'playoff-loss':{
      nick:['This one hurts because there is no “next Sunday fixes it” coupon in the postseason. '+team+' is out, and the empty page for next week is doing most of the talking.'],
      bart:['Elimination is such an ugly word. Unfortunately it is also the correct one. '+team+' has reached the part of the season where even a beautifully phrased complaint cannot buy another game.'],
      tilly:['Season over. I would like to file an appeal with whoever invented single elimination and then throw the form directly into a shredder.'],
      jeff:['The file ends here. I have questions, receipts and several grudges, but no further game to subpoena.']
    },
    lineup:{
      nick:[miss?.reserve?.name+' was a real, legal alternative to '+miss?.starter?.name+', which means this is not Monday-morning fan fiction. That choice belongs on the manager’s desk until somebody makes a better one next week.'],
      bart:['At last, a lineup complaint with proper credentials: '+miss?.reserve?.name+' could actually have occupied '+miss?.starter?.name+'’s seat. I am delighted to discover outrage can occasionally read the rulebook.'],
      tilly:['This one gets the siren because the swap was actually legal. '+miss?.reserve?.name+' could have started over '+miss?.starter?.name+'. No linebackers sneaking into running-back chairs, no imaginary substitutions, just a real decision we are absolutely going to yell about.'],
      jeff:['The lineup complaint survived cross-examination: '+miss?.reserve?.name+' was eligible for the seat held by '+miss?.starter?.name+'. That makes it evidence, not hindsight cosplay.']
    },
    'rout-win':{
      nick:[team+' did not merely beat '+opp+'; it made the fourth quarter feel like paperwork. Those are the Sundays beat writers pretend to find boring because admitting joy feels dangerous.'],
      bart:[team+' turned '+opp+' into background décor. I had prepared nuance; the team responded by kicking nuance down a staircase and asking for dessert.'],
      tilly:[team+' buried '+opp+' so thoroughly the copy desk started asking whether the obituary needed a word limit. This is responsible journalism and I will hear no objections.'],
      jeff:[team+' left very little mystery against '+opp+'. I kept looking for a hidden complication and found only a scoreboard asking me to stop wasting everyone’s time.']
    },
    'rout-loss':{
      nick:['By the middle of this one, I was no longer taking notes so much as documenting a weather event. '+team+' got flattened, and pretending otherwise would insult everyone who watched it.'],
      bart:['There are losses one can analyze delicately. This was not one of them. '+team+' served '+opp+' an evening so hospitable I briefly wondered who was supposed to be the home side.'],
      tilly:['That was not a loss; that was a public service announcement about what not to do on Sunday. I have already requested a larger complaint box.'],
      jeff:['The evidence board ran out of string before '+opp+' ran out of points. '+team+' has explanations to produce and very little room for creative accounting.']
    },
    'close-win':{
      nick:['I aged approximately three years during the final stretch, but a win is a win and the standings do not award style points for preserving a beat writer’s blood pressure.'],
      bart:['A narrow win is simply elegance with heartburn. '+team+' escaped, my pulse remains unbecoming, and we shall all pretend this was character-building.'],
      tilly:['Won by the width of a receipt! I do not care. Print the W first and send the cardiology bill to management later.'],
      jeff:['The margin was thin enough to qualify as evidence tampering, but '+team+' escaped with the result. I have logged the stress separately.']
    },
    'close-loss':{
      nick:['The cruel losses are the ones where you can point to five different moments and convince yourself each one was the moment. '+team+' gave us exactly that kind of miserable homework.'],
      bart:['A close loss is tragedy for people who refuse to admit fantasy football is silly. Naturally, I am devastated. '+team+' had this one close enough to taste and still sent it back.'],
      tilly:['The scoreboard says loss. My blood pressure says felony. Somewhere in those tiny margins is the decision I will be complaining about until Wednesday.'],
      jeff:['Close losses create too many suspects. One lineup choice, one quiet player, one missed opportunity — everybody gets interviewed.']
    },
    heater:{
      nick:[team+' has won enough in a row that I can no longer call it a pleasant accident. I dislike how hopeful that sentence makes me, but the notebook is a sworn document.'],
      bart:['A winning streak is merely repeated competence wearing increasingly expensive clothes. '+team+' is starting to look annoyingly well dressed.'],
      tilly:[team+' keeps winning. This is how cities lose perspective and newspapers start pricing parade confetti in bulk. I support both developments.'],
      jeff:['The streak has survived long enough to become admissible. '+team+' keeps producing the same result, and even this desk eventually has to stop calling that coincidence.']
    },
    spiral:{
      nick:['The next time somebody tells me one loss does not matter, I am going to hand them this streak and a stapler. '+team+' needs a normal Sunday before frustration becomes the team identity.'],
      bart:['A losing streak is repetition without the courtesy of becoming interesting. '+team+' has now offended both the standings and my sense of narrative pacing.'],
      tilly:[team+' keeps losing and the angry font is beginning to think it works here full time. Somebody win a game before it asks for benefits.'],
      jeff:['One loss is an incident. A streak is a pattern, and patterns are how folders become investigations. '+team+' has graduated to the thicker file.']
    },
    'front-office':{
      nick:['Management spent the week changing the roster like the house was on fire. Activity is not the same as improvement, but at least nobody can accuse this front office of sleeping through the smoke.'],
      bart:['The front office shopped with such enthusiasm I expected a valet ticket. Now comes the vulgar part: proving any of it actually improved Sunday.'],
      tilly:['The transaction page got more exercise than some starting lineups. Wonderful for circulation; considerably less wonderful if none of the new furniture can play.'],
      jeff:['The transaction log now has enough pages to require a binder. Every move was a claim about what management believed, and Sunday has started grading the testimony.']
    },
    win:{
      nick:['I follow this team for the same stupid reason everyone else does: a good Sunday can repair an entire week. '+team+' gave us one, and I am not apologizing for enjoying it.'],
      bart:['Winning remains vulgar, addictive and highly recommended. '+team+' has once again forced me to confuse sports fandom with a personality.'],
      tilly:['A win! That is all the excuse this newsroom needed. Somebody put the reasonable font back in storage until further notice.'],
      jeff:['A win makes suspicion less urgent but not less enjoyable. '+team+' gets the benefit of the doubt tonight; I reserve the right to revoke it at lineup lock.']
    },
    loss:{
      nick:['I am irritated because I care, which is the oldest bad deal in sports. '+team+' ruined the afternoon and now gets six days to make me regret writing that sentence.'],
      bart:['I dislike losing personally, aesthetically and on behalf of everyone who wasted a perfectly good Sunday watching it. '+team+' owes the next edition a better ending.'],
      tilly:['This loss stinks. There, sophisticated analysis complete. Now I would like names, answers and a fresh pot of coffee.'],
      jeff:['The file stays open because losing always leaves fingerprints. '+team+' can complain about the investigator after it stops supplying exhibits.']
    }
  };
  return pick(rows[angle]?.[voice]||rows[angle]?.nick||rows.loss[voice],seed);
}

function deskOneLiner(t,voice,seed){
  const won=!!t.won;
  const rows={
    nick:won?[
      'I have covered enough bad Sundays to know a good one deserves to be enjoyed before somebody invents a reason not to.',
      'The old desk has filed a rare positive report. Please do not make this a collector’s item.',
      'I distrust happiness on principle, but I will make an exception until kickoff next week.',
      'Keep the clipping. We have thrown away worse things.'
    ]:[
      'The coffee went cold before my irritation did.',
      'I have filed this under “avoidable,” which is the thickest folder in sports.',
      'Nothing ruins a Sunday quite like having time to think about every decision that led to the loss.',
      'The old desk would like one week without learning a new synonym for aggravation.'
    ],
    bart:won?[
      'I had a devastating critique prepared. Winning has once again sabotaged my art.',
      'Competence looks very good on this roster. I recommend wearing it more often.',
      'Please forgive the optimism; I appear to have been exposed to a victory.',
      'I am trying to remain dignified, but the standings have made dignity feel terribly overrated.'
    ]:[
      'I have seen hotel-lobby art with a clearer plan.',
      'This result had all the elegance of a shopping cart with one bad wheel.',
      'I came prepared to review football and instead received a cry for help with shoulder pads.',
      'The performance was not merely bad; it was badly accessorized.'
    ],
    tilly:won?[
      'Winning is good for morale and catastrophic for newsroom restraint.',
      'I have already made three irresponsible headline decisions and regret none of them.',
      'Somewhere a rival manager is muting the group chat. Journalism works.',
      'The confetti closet has been reopened under questionable supervision.'
    ]:[
      'The complaint department is now accepting walk-ins.',
      'I have loaded the angry font and removed the safety.',
      'The back page would like reimbursement for emotional damages.',
      'If disappointment were rostered, we just found our weekly RB1.'
    ],
    jeff:won?[
      'Optimism remains suspicious, but the evidence is annoyingly favorable.',
      'I searched for a hidden crime scene and found a competent football team. Disturbing.',
      'The defense rests for tonight. I am keeping the lights on anyway.',
      'A clean win is the least interesting investigation and the best possible problem.'
    ]:[
      'The evidence locker is full and management has misplaced the key.',
      'I would like fewer clues next week.',
      'The paper trail has developed a sense of humor and it is not on our side.',
      'Every bad Sunday thinks it is an isolated incident until Jefferson Filch starts labeling folders.'
    ]
  };
  const lead=pick(rows[voice],seed+7);
  const tails={
    nick:[' I have learned to write it down before the next Sunday tries to revise the memory.',' That is the curse of caring about a team: even the jokes end up filed beside the serious notes.'],
    bart:[' I reserve the right to turn this observation into a much grander complaint if circumstances continue to encourage me.',' One must preserve standards, even when the sport itself seems determined to behave like a neighborhood argument.'],
    tilly:[' If this sounds excessive, excellent; moderation has never sold a back page or survived a league group chat.',' I will lower the emotional volume when the football gives me a reason, which is not the arrangement we have today.'],
    jeff:[' The sentence is now in the file, timestamped and available for future embarrassment if management would like to prove me wrong.',' I prefer jokes with documentation; they age better when somebody insists later that none of this was foreseeable.']
  };
  return lead+pick(tails[voice],seed+11);
}

function newsroomOrder(sections,seed){
  const byKind=new Map(sections.map(s=>[s.kind,s]));
  const orders=[
    ['lede','players','management','sentiment','value','outlook'],
    ['lede','management','players','value','sentiment','outlook'],
    ['lede','players','sentiment','management','value','outlook'],
    ['lede','sentiment','players','management','value','outlook'],
    ['lede','management','sentiment','players','value','outlook'],
    ['lede','players','value','management','sentiment','outlook'],
    ['lede','sentiment','management','players','value','outlook'],
    ['lede','management','players','sentiment','value','outlook']
  ];
  return pick(orders,seed).map(k=>byKind.get(k)).filter(Boolean);
}

export function humanSectionsV20({team,week,reporter,facts,sentiment}){
  const base=humanSectionsV19({team,week,reporter,facts,sentiment});
  const seed=articleSeed(team,week),voice=voiceId(reporter),angle=newsroomInsight(team,voice,seed),kicker=deskOneLiner(team,voice,seed);
  const sections=base.map(s=>({...s,paragraphs:[...(s.paragraphs||[])]}));
  const angleTargets=['lede','management','players','sentiment'];
  const angleKind=angleTargets[seed%angleTargets.length],angleSection=sections.find(s=>s.kind===angleKind)||sections[0];
  if(angleSection)angleSection.paragraphs.splice(Math.min(1,angleSection.paragraphs.length),0,angle);
  const kickerTargets=['players','management','sentiment','outlook'];
  const kickerKind=kickerTargets[(seed>>>3)%kickerTargets.length],kickerSection=sections.find(s=>s.kind===kickerKind)||sections[sections.length-1];
  if(kickerSection)kickerSection.paragraphs.push(kicker);
  return newsroomOrder(sections,seed);
}
