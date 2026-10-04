import {applyWeek2EditorialR16 as applyR168} from './inquirer-week2-editorial-r168.mjs';

const section=(article,kind)=>(article?.sections||[]).find(s=>String(s?.kind||'')===kind);
const teamName=team=>String(team?.team_name||team?.name||'this team');
const shortRef=team=>teamName(team).trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const reporter=article=>String(article?.reporter?.name||'Nick Swindell');
const record=team=>{const r=team?.league_context?.record||{};return{wins:Number(r.wins)||0,losses:Number(r.losses)||0,ties:Number(r.ties)||0};};
const score=team=>Number.isFinite(Number(team?.points))?Number(team.points):null;
const opponent=team=>String(team?.next_opponent_name||team?.next_opponent||'the Week 3 opponent');
const sentences=text=>String(text||'').replace(/\bSt\.\s+(?=[A-Z])/g,'St.\u00a0').split(/(?<=[.!?])\s+/).map(x=>x.replace(/\u00a0/g,' ').trim()).filter(Boolean);
const words=text=>String(text||'').trim().split(/\s+/).filter(Boolean).length;
const lowerFirst=s=>s?`${s.charAt(0).toLowerCase()}${s.slice(1)}`:s;
const possessive=s=>/s$/i.test(String(s||''))?`${s}'`:`${s}'s`;
const pluralAlias=s=>/s$/i.test(String(s||''));
const beVerb=s=>pluralAlias(s)?'are':'is';
const sitVerb=s=>pluralAlias(s)?'sit':'sits';

function repairKnownPlayerNameSplits(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>String(p||'').replace(/\bAmon-Ra St\.\s+For [^,]+,\s+brown\b/gi,'Amon-Ra St. Brown'));
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
  const total=Number.isFinite(pts)?pts.toFixed(1):'the Week 2 total',be=beVerb(ref),sit=sitVerb(ref);
  let line;
  if(who==='Tilly Fleecer'){
    if(rec.wins===2)line=`${ref} ${be} 2-0, so the fans have permission to get obnoxious about ${total} points until ${next} gets a vote. Two wins buy confidence; they do not buy immunity from a bad Sunday.`;
    else if(rec.losses===2)line=`${ref} ${be} 0-2 after a ${total}-point Week 2, which means ${next} is no longer a casual appointment. The crowd does not need manufactured drama; the record brought plenty.`;
    else line=`${ref} ${sit} 1-1 after ${total} points, the exact record built to support both swagger and panic at the same tailgate. ${next} gets to decide which emotion was premature.`;
  }else if(who==='Bartholomew Roycington III'){
    if(rec.wins===2)line=`At 2-0, ${ref} may enjoy ${total} points without pretending the season has already signed the certificate of excellence. ${next} now has the discourteous opportunity to test the celebration.`;
    else if(rec.losses===2)line=`At 0-2 after ${total} points, ${ref} has exhausted the tasteful portion of September. ${next} is where concern either becomes relief or acquires considerably sharper language.`;
    else line=`A 1-1 ${ref} team coming off ${total} points has earned neither despair nor a coronation. ${next} gets the next opportunity to make the public mood look wise or magnificently premature.`;
  }else if(who==='Jefferson Filch'){
    if(rec.wins===2)line=`${ref} ${be} 2-0 after ${total} points. That raises the standard for ${next}: another win makes the opening look durable, while a loss gives the skeptics something specific to attack.`;
    else if(rec.losses===2)line=`${ref} ${be} 0-2 after ${total} points, so ${next} arrives with a simple burden. Win and the first two weeks become recoverable; lose and every unresolved weakness gets louder.`;
    else line=`${ref} ${be} 1-1 after ${total} points, which leaves the public argument appropriately unsettled. ${next} can turn that ambiguity into confidence or make the first two weeks look like competing warnings.`;
  }else{
    if(rec.wins===2)line=`${ref} ${be} 2-0 after ${total} points. Fans can enjoy that without pretending ${next} is ceremonial; a third result will say more than another week of confidence speeches.`;
    else if(rec.losses===2)line=`${ref} ${be} 0-2 after ${total} points. Nobody needs a motivational slogan before ${next}; they need enough scoring to stop making the standings accurate.`;
    else line=`${ref} ${be} 1-1 after ${total} points, which is fantasy football's favorite way to make everybody sound certain with half the information. ${next} gets the next word.`;
  }
  sentiment.paragraphs.push(line);
}

function factAnchor(team,sentence){
  const article=team?.inquirer_article,who=reporter(article),ref=shortRef(team),pts=score(team);
  const total=Number.isFinite(pts)?pts.toFixed(1):'its Week 2 total';
  const thought=lowerFirst(sentence);
  if(who==='Tilly Fleecer')return `${ref} put up ${total}, so ${thought}`;
  if(who==='Bartholomew Roycington III')return `After ${total} points from ${ref}, ${thought}`;
  if(who==='Jefferson Filch')return `${possessive(ref)} ${total}-point Week 2 is why ${thought}`;
  return `${ref} scored ${total}, and ${thought}`;
}

function varyCrossTeamExactRepeats(teams){
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
      s.paragraphs=s.paragraphs.map(p=>sentences(p).map(sentence=>{
        const key=sentence.replace(/\s+/g,' ').trim().toLowerCase();
        if(!repeated.has(key))return sentence;
        if(!seen.has(key)){seen.add(key);return sentence;}
        return factAnchor(team,sentence);
      }).join(' ')).filter(p=>String(p||'').trim());
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
    article.structure_revision='week2-r169';
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR168(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(team=>{repairKnownPlayerNameSplits(team);replaceR167Additions(team);return team;});
  varyCrossTeamExactRepeats(out.teams);
  if(out.league_overview)out.league_overview.structure_revision='week2-r169';
  out.structure_revision='week2-r169';
  return out;
}

export const applyWeek2EditorialR169=applyWeek2EditorialR16;
