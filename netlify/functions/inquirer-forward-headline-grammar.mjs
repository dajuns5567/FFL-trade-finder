// Week 3+ headline grammar and continuity normalization.
// Fantasy team names are often plural noun phrases while several templates were
// written with singular verbs/pronouns. Headlines must also describe the current
// edition week rather than carrying stale Week-2 constructions forward.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const PLURAL_VERBS=new Map([
  ['is','are'],['banks','bank'],['takes','take'],['loses','lose'],['leaves','leave'],['makes','make'],['falls','fall'],['has','have'],['keeps','keep'],['wins','win'],['turns','turn'],['spills','spill'],['ruins','ruin'],['puts','put'],['gets','get'],['gives','give'],['raises','raise'],['needs','need'],['owns','own'],['looks','look'],['stays','stay'],['lands','land'],['carries','carry'],['finds','find'],['starts','start'],['ends','end'],['survives','survive'],['escapes','escape'],['faces','face'],['meets','meet'],['moves','move'],['drops','drop'],['climbs','climb'],['slides','slide'],['holds','hold'],['creates','create'],['shows','show'],['exposes','expose']
]);
const ORDINAL_SUNDAY=/\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth)-Sunday\b/gi;
const NUMBER_WORD=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen'];

function nickname(teamName){return norm(teamName).split(/\s+/).filter(Boolean).at(-1)||''}
function isPluralTeam(teamName){const n=nickname(teamName);return /s$/i.test(n)||/49ers$/i.test(n)}
function preserveCase(source,replacement){
  if(!source)return replacement;
  if(source===source.toUpperCase())return replacement.toUpperCase();
  if(/^[A-Z]/.test(source))return replacement.charAt(0).toUpperCase()+replacement.slice(1);
  return replacement;
}

export function normalizeInquirerForwardHeadline(headline,teamNames=[],week=null){
  let h=norm(headline);if(!h)return h;
  const names=[...new Set((teamNames||[]).map(norm).filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(const name of names){
    if(!isPluralTeam(name))continue;
    const re=new RegExp(`^(${esc(name)})\\s+([A-Za-z]+)\\b`,'i'),m=h.match(re);
    if(m){
      const replacement=PLURAL_VERBS.get(String(m[2]||'').toLowerCase());
      if(replacement)h=h.replace(re,`${m[1]} ${preserveCase(m[2],replacement)}`);
      h=h.replace(new RegExp(`^(${esc(name)}\\b[^;:,.!?]{0,90})\\bIts\\b`,'i'),'$1Their');
    }
    break;
  }
  const w=Number(week);
  if(Number.isFinite(w)&&w>=3){
    h=h.replace(ORDINAL_SUNDAY,`Week ${w}`);
    const currentWord=NUMBER_WORD[w]||String(w);
    h=h.replace(/\b(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|\d+) Weeks Into\b/gi,`${currentWord} Weeks Into`);
  }
  h=h
    .replace(/\b(Make|Makes|Made) the Week (\d+) Look\b/g,'$1 Week $2 Look')
    .replace(/\b(Ruin|Ruins|Ruined) ([^;,:]+?)[’'] This Sunday\b/g,'$1 $2’ Sunday')
    .replace(/\bTwo Weeks of result\b/gi,'Two Weeks of Results')
    .replace(/\bweeks? of result\b/gi,m=>m.replace(/result/i,'results'))
    .replace(/^this\b/,'This');
  return norm(h);
}

export function normalizeInquirerForwardHeadlines(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const names=edition.teams.map(t=>String(t?.team_name||'')).filter(Boolean);
  for(const team of edition.teams){const a=team?.inquirer_article;if(a)a.headline=normalizeInquirerForwardHeadline(a.headline,names,week)}
  if(edition.league_overview?.headline)edition.league_overview.headline=normalizeInquirerForwardHeadline(edition.league_overview.headline,names,week);
  return edition;
}

export function findInquirerForwardHeadlineGrammarIssues(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return[];
  const issues=[],names=edition.teams.map(t=>String(t?.team_name||'')).filter(Boolean).sort((a,b)=>b.length-a.length),w=Number(week);
  for(const team of edition.teams){
    const h=norm(team?.inquirer_article?.headline);if(!h)continue;
    for(const name of names){
      if(!isPluralTeam(name))continue;
      const m=h.match(new RegExp(`^${esc(name)}\\s+([A-Za-z]+)\\b`,'i'));
      if(m&&PLURAL_VERBS.has(String(m[1]).toLowerCase()))issues.push({team:String(team?.team_name||''),headline:h,reason:`plural team subject uses singular verb ${m[1]}`});
      if(m&&new RegExp(`^${esc(name)}\\b[^;:,.!?]{0,90}\\bIts\\b`,'i').test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'plural team subject uses singular possessive “its”'});
      if(m)break;
    }
    if(/\b(?:Make|Makes|Made) the Week \d+ Look\b/i.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward “make the Week N look” phrasing'});
    if(/\bweeks? of result\b/i.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward result/result(s) phrasing'});
    if(/[’'] This Sunday\b/.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward possessive This Sunday phrasing'});
    if(ORDINAL_SUNDAY.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'stale ordinal-Sunday phrasing'});
    ORDINAL_SUNDAY.lastIndex=0;
    const weeksInto=h.match(/\b(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|\d+) Weeks Into\b/i);
    if(weeksInto&&w>=3&&String(weeksInto[1]).toLowerCase()!==String(NUMBER_WORD[w]||w).toLowerCase())issues.push({team:String(team?.team_name||''),headline:h,reason:'headline week count is stale'});
    if(/\b(?:bank|take|lose|leave|make|fall|have|keep|win|turn|spill|ruin)\b/.test(h)&&new RegExp(`^(?:${names.map(esc).join('|')})\\s+[a-z]`).test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'corrected headline verb lost title capitalization'});
  }
  return issues;
}
