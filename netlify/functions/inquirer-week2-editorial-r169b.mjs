import {applyWeek2EditorialR16 as applyR169} from './inquirer-week2-editorial-r169.mjs';

const section=(article,kind)=>(article?.sections||[]).find(s=>String(s?.kind||'')===kind);
const teamName=team=>String(team?.team_name||team?.name||'this team');
const shortRef=team=>teamName(team).trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const reporter=article=>String(article?.reporter?.name||'Nick Swindell');
const opponent=team=>String(team?.next_opponent_name||team?.next_opponent||'the Week 3 opponent');
const possessive=s=>/s$/i.test(String(s||''))?`${s}'`:`${s}'s`;
const score=team=>Number.isFinite(Number(team?.points))?Number(team.points):null;
const topStarter=team=>(team?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).sort((a,b)=>Number(b.points)-Number(a.points))[0]||null;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const normalized=s=>clean(s).toLowerCase().replace(/[’']/g,"'").replace(/\d+(?:\.\d+)?/g,'#').replace(/[^a-z#% ]+/g,' ').replace(/\s+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const choose=(team,kind,rows)=>rows[hash(`${team?.roster_id||teamName(team)}|${kind}`)%rows.length];

function rebuild(article){
  if(article&&Array.isArray(article.sections))article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

function rewriteMidaOutlook(team){
  const article=team?.inquirer_article,outlook=section(article,'outlook');
  if(!article||!outlook||!Array.isArray(outlook.paragraphs))return;
  const who=reporter(article),ref=shortRef(team),next=opponent(team),refPoss=possessive(ref),star=topStarter(team);
  const starRead=star?star.name:'the leading starter';
  outlook.paragraphs=outlook.paragraphs.map(p=>{
    const text=clean(p);
    if(/^MIDA\b/i.test(text)){
      const values=[...text.matchAll(/(\d+(?:\.\d+)?)%/g)].map(m=>m[1]);
      if(!values.length)return text;
      const playoff=values[0],title=values[1]||null,odds=Number(playoff);
      const titleRead=title?` and ${title}% for the title`:'';
      const band=Number.isFinite(odds)?(odds>=70?'strong':odds>=35?'live':'thin'):'live';
      if(who==='Tilly Fleecer'){
        const read=band==='strong'?'That is enough optimism to get cocky with, which makes the next bad lineup decision twice as funny.':band==='thin'?`${next} is no longer a casual appointment; that number is already tapping its foot.`:`${next} gets to decide whether the fanbase should swagger or start stress-eating the standings.`;
        return `${refPoss} playoff estimate is ${playoff}%${titleRead}. ${read}`;
      }
      if(who==='Bartholomew Roycington III'){
        const read=band==='strong'?`A handsome figure, certainly, but ${next} still has every right to make the celebration look premature.`:band==='thin'?`${next} now carries the unpleasant duty of deciding whether September becomes merely discourteous or genuinely vulgar.`:`Respectable enough to matter, fragile enough that ${next} can still make the optimism look overdressed.`;
        return `${ref} sits at ${playoff}% for the playoffs${titleRead}. ${read}`;
      }
      if(who==='Jefferson Filch'){
        const read=band==='strong'?`${starRead} helps explain why the number is strong, but ${next} is still where that optimism gets challenged.`:band==='thin'?`${next} is where the roster gets a chance to make that skepticism look foolish.`:`${next} gets the next vote; the number supports neither a coronation nor complacency.`;
        return `${refPoss} playoff estimate is ${playoff}%${titleRead}. ${read}`;
      }
      const read=band==='strong'?`Good position. ${next} still has to be beaten before anyone starts treating the model like a trophy.`:band==='thin'?`${next} matters more because the margin for another ugly result is already small.`:`That is enough uncertainty to make ${next} genuinely informative instead of ceremonial.`;
      return `${refPoss} playoff estimate is ${playoff}%${titleRead}. ${read}`;
    }

    const escapedPoss=refPoss.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const near=text.match(new RegExp(`^${escapedPoss} playoff estimate sits near (\\d+(?:\\.\\d+)?)%\\.`,'i'));
    if(near&&/burden of proof|narrows the room/i.test(text)){
      const odds=Number(near[1]);
      if(odds<10)return `${refPoss} playoff estimate is down at ${near[1]}% even with ${starRead} leading Week 2. ${next} is where the rest of the lineup has to stop making that number look reasonable.`;
      return `${refPoss} playoff estimate is ${near[1]}% after ${starRead} carried the strongest individual line. ${next} needs more of the roster to match that standard.`;
    }

    const hover=text.match(new RegExp(`^${escapedPoss} playoff estimate is hovering near (\\d+(?:\\.\\d+)?)%\\.`,'i'));
    if(hover&&/confidence and panic|useful context/i.test(text)){
      const odds=Number(hover[1]);
      if(odds<30)return `${refPoss} playoff estimate is ${hover[1]}% after ${starRead} supplied the best Week 2 answer. ${next} needs the rest of the lineup to become less theatrical.`;
      if(odds<45)return `${ref} sits at ${hover[1]}% for the playoffs with ${starRead} setting the Week 2 pace. ${next} gets to decide whether that middle ground was cautious or cowardly.`;
      return `${refPoss} playoff estimate is ${hover[1]}%, and ${starRead} is one reason the season still has room to tilt either way. ${next} now gets to separate momentum from two weeks of emotional overreaction.`;
    }

    const strong=text.match(new RegExp(`^${escapedPoss} playoff estimate is (\\d+(?:\\.\\d+)?)%\\.`,'i'));
    if(strong&&/next pressure point/i.test(text)){
      const odds=Number(strong[1]);
      if(odds>=90)return `${refPoss} playoff estimate is already ${strong[1]}%, with ${starRead} helping make that optimism look earned. ${next} is where a great start either becomes authority or gets humbled.`;
      return `${refPoss} playoff estimate is ${strong[1]}%, and ${starRead} gives that confidence something concrete to lean on. ${next} gets the first chance to punish it.`;
    }

    return text;
  });
  rebuild(article);
}

function exactTeamScorePattern(team){
  const pts=score(team);
  if(!Number.isFinite(pts))return null;
  const token=String(pts).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(?:^|[^\\d])${token}(?:[^\\d]|$)`);
}

function isScoreScaffold(text,team){
  const pts=score(team),scorePattern=exactTeamScorePattern(team);
  if(!Number.isFinite(pts)||!scorePattern)return false;
  const hasScore=scorePattern.test(text);
  const genericFinish=/finished (?:in the )?(?:top|bottom) (?:eight|quarter)|(?:top|bottom)[- ](?:eight|quarter) in scoring/i.test(text);
  return hasScore||genericFinish;
}

function playerFrom(text){
  const m=clean(text).match(/^([A-Z][A-Za-z.'’\-]+(?:\s+[A-Z][A-Za-z.'’\-]+){0,3})(?:'s|’s)\b/);
  return m?.[1]||'That player';
}

function reactionLine(team,kind,text){
  const article=team?.inquirer_article,who=reporter(article),ref=shortRef(team),next=opponent(team),won=!!team?.won,player=playerFrom(text);
  const sets={
    'score':{
      'Nick Swindell':[
        `${ref} has already made the scoring problem clear. Repeating the total would not improve the diagnosis; the useful question is whether the rest of the lineup can stop making one bad Sunday feel structural.`,
        `${ref} does not need the same score read back again. The damage is obvious; what matters is whether Week 3 looks like a correction or confirmation.`
      ],
      'Tilly Fleecer':[
        `${ref} already turned the scoreboard into a public complaint. Nobody needs the number again; somebody on this roster needs to make the next Sunday considerably less ridiculous.`,
        `${ref} has supplied enough arithmetic for one week. The fun part now is deciding who gets mocked, who gets forgiven and who has to fix this by Sunday.`
      ],
      'Bartholomew Roycington III':[
        `${ref} has made the arithmetic sufficiently impolite. Repeating the total would be vulgar even by fantasy standards; the interesting matter is whether this roster can produce a less embarrassing sequel.`,
        `${ref} has already submitted the numerical portion of the humiliation. One need not read it twice to understand that the next performance requires considerably better manners.`
      ],
      'Jefferson Filch':[
        `${ref} has already established the damage. Entering the same total again adds nothing; the decisions around it are what deserve scrutiny now.`,
        `${ref} has made the numerical evidence plain. The next useful question is not the total again, but which choices created it and whether those choices survive Week 3.`
      ]
    },
    'result':{
      'Nick Swindell':[
        `The result is settled for ${ref}. The only useful follow-up is whether the choices behind it were repeatable or merely survived by accident.`,
        `${ref} cannot change the result now. It can only prove that the decisions underneath it were better than one Sunday made them look.`
      ],
      'Tilly Fleecer':[
        `${ref} already gave us the result; replaying it will not make it prettier. Week 3 gets the privilege of deciding whether this was a warning or a running joke.`,
        `The result has done enough damage to ${ref}. Now the roster gets to choose between a response and another week of providing free material.`
      ],
      'Bartholomew Roycington III':[
        `The result is already on ${ref}'s permanent record. What remains is the less decorative question of whether the process beneath it deserves another invitation.`,
        `${ref} can keep the result without another recital. The next opponent will decide whether it was merely unfortunate or an early habit in evening wear.`
      ],
      'Jefferson Filch':[
        `The result is not in dispute for ${ref}. The open question is which decisions deserve to survive it.`,
        `${ref} has already supplied the outcome. The investigation moves to cause, because repeating the verdict would only waste time.`
      ]
    },
    'ranking':{
      'Nick Swindell':[
        `${ref}'s place in the weekly scoring order is bad enough without another ranking recital. The point is simple: too many lineups were plainly better.`,
        `${ref} knows where this performance sits in the league. The useful response is not another ordinal; it is giving Week 3 something less bleak to compare.`
      ],
      'Tilly Fleecer':[
        `${ref} does not need another reminder of where this landed in the weekly pecking order. The league already laughed; now make somebody else the punchline.`,
        `${ref}'s neighborhood on the scoring board was ugly enough the first time. The assignment now is relocation.`
      ],
      'Bartholomew Roycington III':[
        `${ref}'s social standing among this week's scorers requires no second announcement. The placement was rude; a better performance would be the only tasteful reply.`,
        `${ref} has already been seated in an unpleasant part of the scoring order. One trusts the roster will object more convincingly next week.`
      ],
      'Jefferson Filch':[
        `${ref}'s position in the weekly scoring order is already documented. Repeating the rank adds nothing; the concern is why the lineup ended up there.`,
        `${ref} has no shortage of evidence that the weekly scoring order was unkind. The remaining question is which roster decisions earned that treatment.`
      ]
    },
    'snap-share':{
      'Nick Swindell':[
        `${player}'s usage is the part worth carrying forward. The exact snap count needs no encore; what matters is whether the role gives this lineup something dependable next week.`,
        `${player}'s role changed enough to matter. Now the football question is whether that opportunity becomes something a fantasy manager can trust.`
      ],
      'Tilly Fleecer':[
        `${player} got a role worth noticing, which is more useful than reading another snap percentage aloud. Turn that opportunity into points and nobody will complain about the missing footnote.`,
        `${player}'s usage has earned another look. The next step is wonderfully uncomplicated: do something with it before the role becomes trivia.`
      ],
      'Bartholomew Roycington III':[
        `${player}'s role has become interesting enough that the percentage itself may leave the room. Opportunity is lovely; production would make it much better company.`,
        `${player} received a more consequential role. One now waits to see whether the opportunity develops taste, purpose and actual fantasy value.`
      ],
      'Jefferson Filch':[
        `${player}'s role changed enough to matter. The percentage is already documented; what matters next is whether the opportunity produces evidence worth trusting.`,
        `${player} has a usage change worth tracking. Another recital of the snap count would add less than seeing whether the role survives contact with Week 3.`
      ]
    },
    'role-showed':{
      'Nick Swindell':[
        `${player}'s workload already told us what the role looked like. The next useful piece is whether the same involvement produces something worth starting.`,
        `${player} had enough opportunity to make the role real. Week 3 should tell us whether it is useful or merely busy.`
      ],
      'Tilly Fleecer':[
        `${player} had enough involvement to get our attention. Great. Now turn all that activity into fantasy points before somebody mistakes motion for progress.`,
        `${player}'s role was visible. The next trick is making it matter on the scoreboard instead of just keeping the stat crew employed.`
      ],
      'Bartholomew Roycington III':[
        `${player}'s involvement was substantial enough to merit attention. Volume is charming; production remains the guest everyone actually hoped would arrive.`,
        `${player} had a role one could see without binoculars. The elegant next step would be converting that opportunity into something useful.`
      ],
      'Jefferson Filch':[
        `${player}'s workload is established. The unresolved point is whether the role creates value or merely creates more data to inspect.`,
        `${player} had enough involvement to remove ambiguity about opportunity. Production is now the part still under questioning.`
      ]
    },
    'projection':{
      'Nick Swindell':[`The projection has already had its say for ${ref}. ${next} matters because another forecast is useless if the lineup cannot make it look wrong.`],
      'Tilly Fleecer':[`The forecast has already been read to ${ref}. ${next} now gets to decide whether the model looks smart or deserves public ridicule.`],
      'Bartholomew Roycington III':[`One projection is quite enough for ${ref}. ${next} may now determine whether the forecast was prudent or merely dressed for dinner.`],
      'Jefferson Filch':[`The projection is already in the record for ${ref}. ${next} is where the lineup gets a chance to contradict it.`]
    },
    'market':{
      'Nick Swindell':[`The roster-value move has been noted for ${ref}. Sunday performance is the part that can actually change the mood.`],
      'Tilly Fleecer':[`The market has already voted on ${ref}. Fine. Fantasy points remain the much louder form of democracy.`],
      'Bartholomew Roycington III':[`The market has registered its opinion of ${ref}. One prefers the less abstract pleasure of seeing the roster justify itself on Sunday.`],
      'Jefferson Filch':[`The market movement is documented for ${ref}. The more useful evidence remains what the lineup does with its next game.`]
    }
  };
  const rows=sets[kind]?.[who]||sets[kind]?.['Nick Swindell']||[text];
  return choose(team,kind,rows);
}

function shapeArticle(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return;
  const exactSeen=new Set(),familyCounts=new Map(),scorePattern=exactTeamScorePattern(team);
  let scoreFacts=0,teamScoreMentions=0,resultFacts=0,rankingFacts=0,week3ProjectionFacts=0,rosterValueFacts=0;
  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    const kept=[];
    for(const raw of s.paragraphs){
      let text=clean(raw);
      if(!text)continue;
      const exact=text.toLowerCase();
      if(exactSeen.has(exact))continue;

      const family=/snap share moved from .* last season to/i.test(text)?'snap-share':/week 2 role showed up as/i.test(text)?'role-showed':null;
      if(family){
        const count=familyCounts.get(family)||0;
        familyCounts.set(family,count+1);
        if(count>=1)text=reactionLine(team,family,text);
      }

      if(scorePattern?.test(text)){
        teamScoreMentions++;
        if(teamScoreMentions>2)text=reactionLine(team,'score',text);
      }
      if(isScoreScaffold(text,team)){
        scoreFacts++;
        if(scoreFacts>2)text=reactionLine(team,'score',text);
      }
      if(/\b(?:beat|defeated|won|lost to|fell to|lost)\b/i.test(text)){
        resultFacts++;
        if(resultFacts>2)text=reactionLine(team,'result',text);
      }
      if(/(?:rank(?:ed|ing)\s+\d+.*(?:32|teams)|top[- ](?:quarter|eight)|bottom[- ](?:quarter|eight)|finished (?:in the )?(?:top|bottom) (?:eight|quarter))/i.test(text)){
        rankingFacts++;
        if(rankingFacts>1)text=reactionLine(team,'ranking',text);
      }
      if(/week 3 projects .* making .* projection favorite/i.test(text)){
        week3ProjectionFacts++;
        if(week3ProjectionFacts>1)text=reactionLine(team,'projection',text);
      }
      if(/roster value (?:rose|fell|moved) from/i.test(text)){
        rosterValueFacts++;
        if(rosterValueFacts>1)text=reactionLine(team,'market',text);
      }

      const finalExact=text.toLowerCase();
      if(exactSeen.has(finalExact))continue;
      const norm=normalized(text);
      const normKey=norm&&norm.length<80?`short:${norm}`:'';
      if(normKey&&exactSeen.has(normKey))continue;
      exactSeen.add(finalExact);
      if(normKey)exactSeen.add(normKey);
      kept.push(text);
    }
    s.paragraphs=kept;
  }
  rebuild(article);
}

function voiceLine(team){
  const article=team?.inquirer_article,pts=score(team);
  if(!article||!Number.isFinite(pts)||pts>55)return '';
  const who=reporter(article),ref=shortRef(team),total=Number.isInteger(pts)?String(pts):pts.toFixed(1);
  if(who==='Tilly Fleecer')return `${ref} just scored ${total}. That is less a fantasy total than an administrative error with a logo attached; there is no analytical varnish thick enough for it.`;
  if(who==='Jefferson Filch')return `${ref} posted ${total}. At that point the box score stops asking for interpretation and starts looking for an alibi.`;
  if(who==='Bartholomew Roycington III')return `${ref} produced ${total}, an afternoon so discourteous to competitive football that one is tempted to send the lineup a formal complaint.`;
  return `${ref} scored ${total}. There is no clever way around it: that was a bad lineup result, and Week 3 has to show whether it was a collapse or a warning.`;
}

function enforceVoiceFloor(team){
  const article=team?.inquirer_article,line=voiceLine(team);
  if(!article||!line||!Array.isArray(article.sections))return;
  if(article.sections.some(s=>(s?.paragraphs||[]).some(p=>clean(p)===line)))return;
  const target=article.sections.find(s=>Array.isArray(s?.paragraphs)&&s.paragraphs.length)||article.sections.find(s=>Array.isArray(s?.paragraphs));
  if(!target)return;
  target.paragraphs.splice(Math.min(1,target.paragraphs.length),0,line);
  rebuild(article);
}

function isolateBreakout(node,seen=new WeakSet()){
  if(!node||typeof node!=='object')return;
  if(seen.has(node))return;
  seen.add(node);
  if(Array.isArray(node)){node.forEach(x=>isolateBreakout(x,seen));return;}

  const copy='Dallas Turner keeps forcing his way into the fantasy conversation. Another disruptive Sunday made the Week 3 question simple: if that role holds, leaving him on the bench starts looking stubborn rather than cautious.';
  const titleFields=['title','headline','label','heading','name','kicker','section_title'];
  const title=clean(titleFields.map(k=>typeof node[k]==='string'?node[k]:'').find(Boolean)||'');
  const breakoutNode=/Breakout Player to Watch/i.test(title)&&/Dallas Turner/i.test(title);

  for(const [key,value] of Object.entries(node)){
    if(typeof value!=='string')continue;
    if(/Dallas Turner/i.test(value)&&/Devin Lloyd/i.test(value))node[key]=copy;
  }

  if(breakoutNode){
    for(const key of ['copy','text','body','description','summary','content','value','take'])if(typeof node[key]==='string')node[key]=copy;
    if(Array.isArray(node.paragraphs))node.paragraphs=[copy];
  }
  Object.values(node).forEach(x=>isolateBreakout(x,seen));
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  isolateBreakout(out);
  out.teams=(out.teams||[]).map(team=>{
    rewriteMidaOutlook(team);
    shapeArticle(team);
    enforceVoiceFloor(team);
    return team;
  });
  return out;
}

export const applyWeek2EditorialR169B=applyWeek2EditorialR16;
