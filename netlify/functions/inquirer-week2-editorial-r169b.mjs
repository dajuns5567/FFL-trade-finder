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

function isScoreScaffold(text,team){
  const pts=score(team);
  if(!Number.isFinite(pts))return false;
  const escaped=String(pts).replace('.','\\.');
  const hasScore=new RegExp(`(?:scored|score|put up|finished).*?${escaped}(?:\\b|$)`,'i').test(text);
  const genericFinish=/finished (?:in the )?bottom (?:eight|quarter)|bottom eight in scoring/i.test(text);
  return hasScore||genericFinish;
}

function shapeArticle(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return;
  const exactSeen=new Set(),familyCounts=new Map();
  let scoreFacts=0,week3ProjectionFacts=0,rosterValueFacts=0;
  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    const kept=[];
    for(const raw of s.paragraphs){
      const text=clean(raw);
      if(!text)continue;
      const exact=text.toLowerCase();
      if(exactSeen.has(exact))continue;

      const family=/snap share moved from .* last season to/i.test(text)?'snap-share':/week 2 role showed up as/i.test(text)?'role-showed':null;
      if(family){
        const count=familyCounts.get(family)||0;
        if(count>=1)continue;
        familyCounts.set(family,count+1);
      }

      if(isScoreScaffold(text,team)){
        scoreFacts++;
        if(scoreFacts>3)continue;
      }
      if(/week 3 projects .* making .* projection favorite/i.test(text)){
        week3ProjectionFacts++;
        if(week3ProjectionFacts>1)continue;
      }
      if(/roster value (?:rose|fell|moved) from/i.test(text)){
        rosterValueFacts++;
        if(rosterValueFacts>1)continue;
      }

      const norm=normalized(text);
      const normKey=norm&&norm.length<80?`short:${norm}`:'';
      if(normKey&&exactSeen.has(normKey))continue;
      exactSeen.add(exact);
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
  const title=clean(node.title||node.headline||'');
  const match=title.match(/^Breakout Player to Watch:\s*(.+)$/i);
  if(match){
    const player=clean(match[1]);
    const copy=`${player} entered Week 2 on Breakout Watch, and Week 2 did not erase that case. Keep the watch on ${player} for Week 3; the role and trajectory still deserve another look.`;
    for(const key of ['copy','text','body','description','summary'])if(typeof node[key]==='string')node[key]=copy;
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
