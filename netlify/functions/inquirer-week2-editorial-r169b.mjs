import {applyWeek2EditorialR16 as applyR169} from './inquirer-week2-editorial-r169.mjs';

const section=(article,kind)=>(article?.sections||[]).find(s=>String(s?.kind||'')===kind);
const teamName=team=>String(team?.team_name||team?.name||'this team');
const shortRef=team=>teamName(team).trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const reporter=article=>String(article?.reporter?.name||'Nick Swindell');
const opponent=team=>String(team?.next_opponent_name||team?.next_opponent||'the Week 3 opponent');
const possessive=s=>/s$/i.test(String(s||''))?`${s}'`:`${s}'s`;
const score=team=>Number.isFinite(Number(team?.points))?Number(team.points):null;

function rewriteMidaOutlook(team){
  const article=team?.inquirer_article,outlook=section(article,'outlook');
  if(!article||!outlook||!Array.isArray(outlook.paragraphs))return;
  const who=reporter(article),ref=shortRef(team),next=opponent(team),refPoss=possessive(ref),pts=score(team);
  const total=Number.isFinite(pts)?pts.toFixed(1):'the Week 2 total';
  outlook.paragraphs=outlook.paragraphs.map(p=>{
    const text=String(p||'').trim();
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
        const read=band==='strong'?`${next} is the next pressure point: a strong estimate raises the standard instead of ending the argument.`:band==='thin'?`${next} is where the roster gets a chance to make that skepticism look foolish.`:`${next} gets the next vote; the number supports neither a coronation nor complacency.`;
        return `${refPoss} playoff estimate is ${playoff}%${titleRead}. ${read}`;
      }
      const read=band==='strong'?`Good position. ${next} still has to be beaten before anyone starts treating the model like a trophy.`:band==='thin'?`${next} matters more because the margin for another ugly result is already small.`:`That is enough uncertainty to make ${next} genuinely informative instead of ceremonial.`;
      return `${refPoss} playoff estimate is ${playoff}%${titleRead}. ${read}`;
    }

    // R169 already naturalized many MIDA lines. Only rewrite the few remaining
    // normalized shapes that still repeat across teams in rendered Week 2 output.
    const near=text.match(new RegExp(`^${refPoss.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')} playoff estimate sits near (\\d+(?:\\.\\d+)?)%\\.`,'i'));
    if(near&&/burden of proof|narrows the room/i.test(text)){
      const odds=Number(near[1]);
      if(odds<10)return `${refPoss} playoff estimate is down at ${near[1]}% after ${total} points. ${next} is not a philosophical exercise now; it is a chance to stop the first two weeks from hardening into a verdict.`;
      return `${refPoss} playoff estimate is ${near[1]}% after a ${total}-point Week 2. ${next} has to turn that number upward before skepticism becomes the easiest position in the room.`;
    }

    const hover=text.match(new RegExp(`^${refPoss.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')} playoff estimate is hovering near (\\d+(?:\\.\\d+)?)%\\.`,'i'));
    if(hover&&/confidence and panic|useful context/i.test(text)){
      const odds=Number(hover[1]);
      if(odds<30)return `${refPoss} playoff estimate is ${hover[1]}% after ${total} points. ${next} has officially graduated from “next game” to “please stop making September weird.”`;
      if(odds<45)return `${ref} sits at ${hover[1]}% for the playoffs after scoring ${total}. ${next} gets to decide whether that middle ground was cautious or just cowardly.`;
      return `${ref} is sitting at ${hover[1]}% for the playoffs after ${total} points. ${next} now gets the delightful job of separating real momentum from two weeks of emotional overreaction.`;
    }

    const strong=text.match(new RegExp(`^${refPoss.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')} playoff estimate is (\\d+(?:\\.\\d+)?)%\\.`,'i'));
    if(strong&&/next pressure point/i.test(text)){
      const odds=Number(strong[1]);
      if(odds>=90)return `${ref} is already at ${strong[1]}% for the playoffs. ${next} is where a great start either becomes authority or gets reminded that September is still capable of humiliation.`;
      return `${refPoss} playoff estimate is ${strong[1]}%, which is strong enough to raise expectations without excusing anything. ${next} gets the first chance to punish that confidence.`;
    }

    return text;
  });
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(team=>{rewriteMidaOutlook(team);return team;});
  return out;
}

export const applyWeek2EditorialR169B=applyWeek2EditorialR16;
