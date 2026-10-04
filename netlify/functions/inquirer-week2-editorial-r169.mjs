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
const escapeRegExp=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'n/a';

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

function repairCoolThroneRecognition(team){
  const article=team?.inquirer_article,cool=section(article,'cool-throne');
  if(!article||!cool||!Array.isArray(cool.paragraphs)||!cool.paragraphs.length)return;
  const eligible=(team?.starter_details||[]).filter(p=>{
    const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
    return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
  }).sort((a,b)=>Number(b?.points)-Number(a?.points)).slice(0,2);
  if(eligible.length<2)return;
  const copy=cool.paragraphs.join(' ').toLowerCase(),first=eligible[0],second=eligible[1];
  if(!copy.includes(String(first?.name||'').toLowerCase())||copy.includes(String(second?.name||'').toLowerCase()))return;
  const who=reporter(article),ref=shortRef(team),pts=Number(second?.points),proj=Number(second?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  const beatProj=Number.isFinite(delta)&&delta>=0.5?` and beat projection by ${fmt(delta)}`:'';
  let line;
  if(who==='Tilly Fleecer')line=`${second.name} barges into the second Cool Throne spot with ${fmt(pts)} points${beatProj}. ${ref} had two performances worth celebrating, which is terribly inconvenient for anyone committed to a single hero.`;
  else if(who==='Bartholomew Roycington III')line=`${second.name} joins ${first.name} on the Cool Throne after ${fmt(pts)} points${beatProj}. Two deserving names do not cheapen the honor; they merely rescue it from bad arithmetic.`;
  else if(who==='Jefferson Filch')line=`${second.name} belongs in the second Cool Throne spot with ${fmt(pts)} points${beatProj}. Leaving him out would make ${possessive(ref)} praise less accurate than the box score.`;
  else line=`${second.name} gets the second Cool Throne spot with ${fmt(pts)} points${beatProj}. ${ref} had two players who earned the mention, so both names stay in.`;
  if(cool.paragraphs.length>=2)cool.paragraphs[1]=line;else cool.paragraphs.push(line);
}

function repairPluralTeamGrammar(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  const full=teamName(team),ref=shortRef(team);
  if(!pluralAlias(ref))return;
  const subject=new RegExp(`^(?:${escapeRegExp(full)}|${escapeRegExp(ref)})\\s+(is|has|gets|holds|brings|turns)\\b`,'i');
  const pluralVerb={is:'are',has:'have',gets:'get',holds:'hold',brings:'bring',turns:'turn'};
  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>sentences(p).map(sentence=>sentence.replace(subject,(match,verb)=>match.slice(0,match.length-verb.length)+pluralVerb[String(verb).toLowerCase()])).join(' '));
  }
}

function repairExplicitMidaPhrasing(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  const ref=shortRef(team),refPoss=possessive(ref);
  const matchup=/^MIDA has .+? around (\d+(?:\.\d+)?)% for the playoffs and (.+?) around (\d+(?:\.\d+)?)%\.\s+For [^,]+,\s+.*$/i;
  const single=/^MIDA has .+? around (\d+(?:\.\d+)?)% to make the playoffs\.\s+.*$/i;
  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>{
      const text=String(p||'');
      let m=text.match(matchup);
      if(m){
        const own=Number(m[1]),oppName=String(m[2]||'the opponent'),opp=Number(m[3]),gap=own-opp;
        let read;
        if(gap>=40)read='The gap is enormous on paper. It still has to survive contact with an actual lineup.';
        else if(gap>=0)read='That edge is worth using, not admiring; Week 3 still has to justify it.';
        else if(gap<=-40)read='The model is openly skeptical. Week 3 is where the roster gets to make that look foolish.';
        else read='The model leans the other way. Week 3 gives the roster a chance to change the argument.';
        return `${refPoss} playoff estimate sits at ${m[1]}% against ${possessive(oppName)} ${m[3]}%. ${read}`;
      }
      m=text.match(single);
      if(m)return `${refPoss} playoff estimate sits around ${m[1]}%. That is encouraging, but a strong model number is not a permission slip; the next result still has to agree.`;
      return text;
    });
  }
}

function diversifyNormalizedTemplates(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  const who=reporter(article),ref=shortRef(team),refPoss=possessive(ref);
  const starterByName=new Map((team?.starter_details||[]).map(p=>[String(p?.name||'').toLowerCase(),p]));
  const scoreShare=/^(.+?) accounted for about (\d+(?:\.\d+)?)% of the team's Week 2 scoring\.$/i;
  const secondThrone=/^(.+?) gets the second after that Week 2 result\.$/i;
  const midaPlayoffs=/^MIDA has .+? around (\d+(?:\.\d+)?)% for the playoffs\.$/i;

  const scoreShareLine=(player,pct)=>{
    if(who==='Tilly Fleecer')return `${pct}% of ${refPoss} Week 2 points came from ${player}. That is the kind of share that makes the quiet lineup spots look guilty by association.`;
    if(who==='Bartholomew Roycington III')return `${player} supplied roughly ${pct}% of ${refPoss} Week 2 scoring, an allocation far too concentrated to dismiss as a statistical curiosity.`;
    if(who==='Jefferson Filch')return `${player} generated about ${pct}% of ${refPoss} Week 2 points. When one name owns that much of the total, every silent starter becomes part of the explanation.`;
    return `${player} produced roughly ${pct}% of ${refPoss} Week 2 scoring. One starter carrying that much of the total is useful; needing it is the problem.`;
  };
  const secondThroneLine=player=>{
    const p=starterByName.get(String(player||'').toLowerCase()),pts=Number(p?.points),total=Number.isFinite(pts)?`${fmt(pts)} points`:'that Week 2 line';
    if(who==='Tilly Fleecer')return `${player} crashes the other Cool Throne seat with ${total}; subtlety was not invited.`;
    if(who==='Bartholomew Roycington III')return `${player} occupies the other Cool Throne seat after ${total}; omitting that performance would be indefensible bookkeeping.`;
    if(who==='Jefferson Filch')return `${player} takes the other Cool Throne spot with ${total}. The number is too loud to leave out of the finding.`;
    return `${player} takes the other Cool Throne spot after ${total}. That performance belongs in the same sentence as the first one.`;
  };
  const midaLine=pct=>{
    const odds=Number(pct),band=Number.isFinite(odds)?(odds>=65?'strong':odds>=35?'live':'thin'):'live';
    if(who==='Tilly Fleecer')return `${refPoss} playoff estimate is hovering near ${pct}%. ${band==='strong'?'That is enough optimism to get dangerous with.':band==='thin'?'That is thin enough to make Week 3 feel rude already.':'That is the perfect range for confidence and panic to share a parking spot.'}`;
    if(who==='Bartholomew Roycington III')return `The playoff model leaves ${ref} at roughly ${pct}%. ${band==='strong'?'A healthy figure, though hardly a coronation.':band==='thin'?'A figure so modest that September has already misplaced its manners.':'Substantial enough to matter, fragile enough to forbid self-congratulation.'}`;
    if(who==='Jefferson Filch')return `${refPoss} playoff estimate sits near ${pct}%. ${band==='strong'?'The number supports confidence, but it does not close the case.':band==='thin'?'That narrows the room for another bad result considerably.':'The number keeps both the optimists and the skeptics under questioning.'}`;
    return `${refPoss} playoff estimate is about ${pct}%. ${band==='strong'?'Good position, not permission to coast.':band==='thin'?'That makes Week 3 matter more than anyone wanted this early.':'That is enough uncertainty to make the next result genuinely informative.'}`;
  };

  for(const s of article.sections){
    if(!Array.isArray(s?.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>sentences(p).map(sentence=>{
      let m=sentence.match(scoreShare);if(m)return scoreShareLine(m[1],m[2]);
      m=sentence.match(secondThrone);if(m)return secondThroneLine(m[1]);
      m=sentence.match(midaPlayoffs);if(m)return midaLine(m[1]);
      return sentence;
    }).join(' '));
  }
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
  out.teams=(out.teams||[]).map(team=>{repairKnownPlayerNameSplits(team);replaceR167Additions(team);repairCoolThroneRecognition(team);repairPluralTeamGrammar(team);repairExplicitMidaPhrasing(team);diversifyNormalizedTemplates(team);return team;});
  varyCrossTeamExactRepeats(out.teams);
  if(out.league_overview)out.league_overview.structure_revision='week2-r169';
  out.structure_revision='week2-r169';
  return out;
}

export const applyWeek2EditorialR169=applyWeek2EditorialR16;
