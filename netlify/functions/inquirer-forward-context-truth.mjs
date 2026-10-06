// Week 3+ factual-continuity and casing guard.
// Runs after stylistic transforms so late rewrites cannot leave stale current
// records, fake future-opponent records, lower-cased proper names or standings
// commentary that contradicts the team's actual position.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function entities(edition){
  const map=new Map();
  const add=value=>{const v=norm(value);if(v&&!map.has(v.toLowerCase()))map.set(v.toLowerCase(),v)};
  for(const team of edition?.teams||[]){
    add(team?.team_name);add(team?.opponent_name);add(team?.next_opponent_name);add(team?.manager_name);
    for(const p of team?.starter_details||[])add(p?.name);
    for(const p of team?.bench_details||[])add(p?.name);
  }
  return [...map.values()].sort((a,b)=>b.length-a.length);
}

function restoreCase(text,names){
  let out=String(text||'');
  for(const name of names)out=out.replace(new RegExp(`\\b${esc(name)}\\b`,'gi'),name);
  return out;
}

function recordText(team){
  const r=team?.league_context?.record||team?.division_context?.record||{};
  const w=Number(r?.wins),l=Number(r?.losses),t=Number(r?.ties)||0;
  if(!Number.isFinite(w)||!Number.isFinite(l))return'';
  return t>0?`${w}-${l}-${t}`:`${w}-${l}`;
}

function aliases(team){
  const full=norm(team?.team_name),last=full.split(/\s+/).filter(Boolean).at(-1)||full;
  return [...new Set([full,last].filter(Boolean))].sort((a,b)=>b.length-a.length);
}

function correctCurrentRecord(text,team){
  const expected=recordText(team);if(!expected)return text;
  let out=String(text||'');
  for(const alias of aliases(team)){
    const a=esc(alias);
    // Current-state constructions. Do not touch historical "from X to Y" clauses.
    out=out.replace(new RegExp(`\\bAt\\s+\\d+-\\d+(?:-\\d+)?,(?=\\s+(?:the\\s+)?${a}\\b)`,'gi'),`At ${expected},`);
    out=out.replace(new RegExp(`((?:\\bthe\\s+)?\\b${a}\\b\\s+(?:are|is|sit|sits|stand|stands)\\s+)\\d+-\\d+(?:-\\d+)?\\b`,'gi'),`$1${expected}`);
    out=out.replace(new RegExp(`\\bAt\\s+\\d+-\\d+(?:-\\d+)?,(?=\\s+(?:the\\s+)?${a}\\s+(?:crowd|supporters|fans)\\b)`,'gi'),`At ${expected},`);
  }
  return out;
}

function stripUnplayedFutureRecord(text){
  return String(text||'')
    .replace(/,?\s*(?:currently\s+|sitting\s+|carrying\s+|at\s+)0-0\s*(?:\([^)]*current ranked snapshot[^)]*\))?\s*(?:and\s+)?(?:outside\s+the\s+current\s+ranked\s+snapshot)?/gi,'')
    .replace(/\s+0-0\s*\(outside\s+the\s+current\s+ranked\s+snapshot\)/gi,'')
    .replace(/\s+,/g,',')
    .replace(/\s{2,}/g,' ')
    .trim();
}

function fixWeekLanguage(text,week){
  let out=String(text||'');
  if(Number(week)<=13){
    out=out.replace(/\b(?:round|Sunday)\s+(\d{1,2})\b/gi,'Week $1');
    out=out.replace(new RegExp(`\\bWeek\\s+${Math.max(1,Number(week)-1)}\\s+just\\s+gave\\b`,'gi'),`Week ${week} just gave`);
  }
  return out
    .replace(/\bSeptember order are\b/gi,'September standings are')
    .replace(/\bthe race are\b/gi,'the race is')
    .replace(/\bthe first the last two weeks\b/gi,'the last two weeks')
    .replace(/\bmade the (Week \d+) volume (up|down)\b/gi,'turned the $1 volume $2')
    .replace(/\s{2,}/g,' ')
    .trim();
}

function fixStandingsContradiction(text,team){
  const rank=Number(team?.league_context?.standings_rank);
  if(!Number.isFinite(rank)||rank<=16)return text;
  return String(text||'')
    .replace(/It is far too early for a coronation, though there is no rule requiring one to apologize for a good seat at the standings\.?/gi,
      `Nobody is planning a coronation from #${rank}; the standings are currently serving criticism, not champagne.`)
    .replace(/A good seat in (?:October|September) is not a championship\. It is still better than standing in the aisle\.?/gi,
      `The #${rank} seat is not comfortable enough for metaphors about luxury; it is a prompt to start climbing.`);
}

function fixText(text,team,names,week){
  let out=restoreCase(text,names);
  out=correctCurrentRecord(out,team);
  out=stripUnplayedFutureRecord(out);
  out=fixWeekLanguage(out,week);
  out=fixStandingsContradiction(out,team);
  out=restoreCase(out,names);
  return out;
}

function article(team,names,week){
  const a=team?.inquirer_article;if(!a)return;
  for(const sec of a.sections||[]){
    if(sec?.heading)sec.heading=restoreCase(sec.heading,names);
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=sec.paragraphs.map(p=>fixText(p,team,names,week)).filter(Boolean);
    for(const block of sec?.blocks||[]){
      if(block?.heading)block.heading=restoreCase(block.heading,names);
      if(Array.isArray(block?.paragraphs))block.paragraphs=block.paragraphs.map(p=>fixText(p,team,names,week)).filter(Boolean);
    }
  }
  if(a.headline)a.headline=restoreCase(a.headline,names).replace(/^this\b/,'This');
  if(a.deck)a.deck=restoreCase(a.deck,names);
  if(a.aside)a.aside=restoreCase(a.aside,names);
  a.paragraphs=(a.sections||[]).flatMap(sec=>[...(sec?.paragraphs||[]),...(sec?.blocks||[]).flatMap(block=>block?.paragraphs||[])]).filter(Boolean);
}

function overview(o,names,week){
  if(!o)return;
  const fix=text=>restoreCase(fixWeekLanguage(stripUnplayedFutureRecord(text),week),names);
  for(const sec of o.sections||[]){
    if(sec?.heading)sec.heading=restoreCase(sec.heading,names);
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=sec.paragraphs.map(fix).filter(Boolean);
    for(const block of sec?.blocks||[]){
      if(block?.heading)block.heading=restoreCase(block.heading,names);
      if(Array.isArray(block?.paragraphs))block.paragraphs=block.paragraphs.map(fix).filter(Boolean);
    }
  }
  for(const hot of o.hot_takes||[]){if(hot?.title)hot.title=restoreCase(hot.title,names);if(hot?.take)hot.take=fix(hot.take)}
  if(o.headline)o.headline=restoreCase(o.headline,names);
  if(o.deck)o.deck=restoreCase(o.deck,names);
}

function allText(edition){
  const rows=[];
  for(const team of edition?.teams||[]){
    const a=team?.inquirer_article;if(!a)continue;
    rows.push(a.headline||'',a.deck||'',...(a.paragraphs||[]));
  }
  const o=edition?.league_overview;
  if(o){rows.push(o.headline||'',o.deck||'');for(const sec of o.sections||[]){rows.push(...(sec?.paragraphs||[]));for(const b of sec?.blocks||[])rows.push(...(b?.paragraphs||[]))}}
  return rows.join('\n');
}

export function findInquirerForwardContextTruthIssues(edition,{week}={}){
  if(!edition||Number(week)<3)return[];
  const issues=[],names=entities(edition),text=allText(edition);
  if(/\b(?:round|Sunday)\s+\d{1,2}\b/i.test(text)&&Number(week)<=13)issues.push({kind:'regular-season-week-label'});
  if(/\bleague order\b/i.test(text))issues.push({kind:'league-order-language'});
  if(/\b(?:currently|sitting|carrying|at)\s+0-0\b[^.!?]{0,80}\bcurrent ranked snapshot\b/i.test(text))issues.push({kind:'unplayed-future-record'});
  for(const name of names){const lower=name.charAt(0).toLowerCase()+name.slice(1);if(lower!==name&&text.includes(lower)){issues.push({kind:'lowercase-canonical-entity',entity:name});break}}
  for(const team of edition.teams||[]){
    const expected=recordText(team);if(!expected)continue;
    const body=(team?.inquirer_article?.paragraphs||[]).join(' ');
    for(const alias of aliases(team)){
      const a=esc(alias);
      const match=body.match(new RegExp(`(?:At\\s+|(?:the\\s+)?${a}\\s+(?:are|is|sit|sits|stand|stands)\\s+)(\\d+-\\d+(?:-\\d+)?)`,'i'));
      if(match&&match[1]!==expected){issues.push({kind:'stale-current-record',team:team.team_name,expected,found:match[1]});break}
    }
  }
  return issues;
}

export function enforceInquirerForwardContextTruth(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const names=entities(edition);
  for(const team of edition.teams)article(team,names,Number(week));
  overview(edition.league_overview,names,Number(week));
  return edition;
}
