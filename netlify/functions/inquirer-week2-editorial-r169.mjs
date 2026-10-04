import {applyWeek2EditorialR16 as applyR168} from './inquirer-week2-editorial-r168.mjs';

const section=(article,kind)=>(article?.sections||[]).find(s=>String(s?.kind||'')===kind);
const teamName=team=>String(team?.team_name||team?.name||'this team');
const shortRef=team=>teamName(team).trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const reporter=article=>String(article?.reporter?.name||'Nick Swindell');
const record=team=>{const r=team?.league_context?.record||{};return{wins:Number(r.wins)||0,losses:Number(r.losses)||0,ties:Number(r.ties)||0};};
const score=team=>Number.isFinite(Number(team?.points))?Number(team.points):null;
const opponent=team=>String(team?.next_opponent_name||team?.next_opponent||'the Week 3 opponent');
const sentences=text=>String(text||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words=text=>String(text||'').trim().split(/\s+/).filter(Boolean).length;
const escapeRegExp=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const upperFirst=s=>s?`${s.charAt(0).toUpperCase()}${s.slice(1)}`:s;

function stripRedundantAnchors(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  const ref=shortRef(team),anchor=new RegExp(`^For ${escapeRegExp(ref)},\\s*`,'i');
  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>sentences(p).map(sentence=>anchor.test(sentence)?upperFirst(sentence.replace(anchor,'')):sentence).join(' '));
  }
}

function replaceR167Additions(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  // R167 appended exactly one synthetic paragraph to each of these sections.
  // Remove those bank-selected additions rather than carrying the canned line pool forward.
  for(const kind of ['management','sentiment']){
    const s=section(article,kind);
    if(Array.isArray(s?.paragraphs)&&s.paragraphs.length)s.paragraphs.pop();
  }

  const sentiment=section(article,'sentiment');
  if(!sentiment||!Array.isArray(sentiment.paragraphs))return;
  const who=reporter(article),ref=shortRef(team),rec=record(team),pts=score(team),next=opponent(team);
  const total=Number.isFinite(pts)?pts.toFixed(1):'the Week 2 total';
  let line;
  if(who==='Tilly Fleecer'){
    if(rec.wins===2)line=`${ref} is 2-0, so the fans have permission to get obnoxious about ${total} points until ${next} gets a vote. Two wins buy confidence; they do not buy immunity from a bad Sunday.`;
    else if(rec.losses===2)line=`${ref} is 0-2 after a ${total}-point Week 2, which means ${next} is no longer a casual appointment. The crowd does not need manufactured drama; the record brought plenty.`;
    else line=`${ref} sits 1-1 after ${total} points, the exact record built to support both swagger and panic at the same tailgate. ${next} gets to decide which emotion was premature.`;
  }else if(who==='Bartholomew Roycington III'){
    if(rec.wins===2)line=`At 2-0, ${ref} may enjoy ${total} points without pretending the season has already signed the certificate of excellence. ${next} now has the discourteous opportunity to test the celebration.`;
    else if(rec.losses===2)line=`At 0-2 after ${total} points, ${ref} has exhausted the tasteful portion of September. ${next} is where concern either becomes relief or acquires considerably sharper language.`;
    else line=`A 1-1 ${ref} team coming off ${total} points has earned neither despair nor a coronation. ${next} will have to provide the next piece of emotional furniture, and I promise not to call it furniture.`;
  }else if(who==='Jefferson Filch'){
    if(rec.wins===2)line=`${ref} is 2-0 after ${total} points. That raises the standard for ${next}: another win makes the opening look durable, while a loss gives the skeptics something specific to attack.`;
    else if(rec.losses===2)line=`${ref} is 0-2 after ${total} points, so ${next} arrives with a simple burden. Win and the first two weeks become recoverable; lose and every unresolved weakness gets louder.`;
    else line=`${ref} is 1-1 after ${total} points, which leaves the public argument appropriately unsettled. ${next} can turn that ambiguity into confidence or make the first two weeks look like competing warnings.`;
  }else{
    if(rec.wins===2)line=`${ref} is 2-0 after ${total} points. Fans can enjoy that without pretending ${next} is ceremonial; a third result will say more than another week of confidence speeches.`;
    else if(rec.losses===2)line=`${ref} is 0-2 after ${total} points. Nobody needs a motivational slogan before ${next}; they need enough scoring to stop making the standings accurate.`;
    else line=`${ref} is 1-1 after ${total} points, which is fantasy football's favorite way to make everybody sound certain with half the evidence. ${next} gets the next word.`;
  }
  sentiment.paragraphs.push(line);
}

function removeCrossTeamExactRepeats(teams){
  const owners=new Map();
  for(const team of teams){
    const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))continue;
    for(const s of article.sections){
      for(const p of s?.paragraphs||[]){
        for(const sentence of sentences(p)){
          if(words(sentence)<6)continue;
          const key=sentence.replace(/\s+/g,' ').trim().toLowerCase();
          if(!owners.has(key))owners.set(key,new Set());
          owners.get(key).add(teamName(team));
        }
      }
    }
  }
  const repeated=new Set([...owners].filter(([,names])=>names.size>1).map(([key])=>key));
  const seen=new Set();
  for(const team of teams){
    const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))continue;
    for(const s of article.sections){
      if(!Array.isArray(s?.paragraphs))continue;
      s.paragraphs=s.paragraphs.map(p=>{
        const kept=[];
        for(const sentence of sentences(p)){
          const key=sentence.replace(/\s+/g,' ').trim().toLowerCase();
          if(repeated.has(key)&&seen.has(key))continue;
          if(repeated.has(key))seen.add(key);
          kept.push(sentence);
        }
        return kept.join(' ');
      }).filter(p=>String(p||'').trim());
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
    article.structure_revision='week2-r169';
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR168(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(team=>{
    replaceR167Additions(team);
    stripRedundantAnchors(team);
    return team;
  });
  removeCrossTeamExactRepeats(out.teams);
  if(out.league_overview)out.league_overview.structure_revision='week2-r169';
  out.structure_revision='week2-r169';
  return out;
}

export const applyWeek2EditorialR169=applyWeek2EditorialR16;
