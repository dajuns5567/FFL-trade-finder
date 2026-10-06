// Week 3+ headline grammar normalization.
// Fantasy team names are often plural noun phrases (Chiefs, Ravens, 49ers, etc.)
// while several headline templates were written with singular verbs. Normalize
// only the leading team-name + verb construction and a few awkward week phrases;
// football facts, names and numbers remain untouched.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const PLURAL_VERBS=new Map([
  ['banks','bank'],['takes','take'],['loses','lose'],['leaves','leave'],['makes','make'],['falls','fall'],['has','have'],['keeps','keep'],['wins','win'],['turns','turn'],['spills','spill'],['ruins','ruin'],['puts','put'],['gets','get'],['gives','give'],['raises','raise'],['needs','need'],['owns','own'],['looks','look'],['stays','stay'],['lands','land'],['carries','carry'],['finds','find'],['starts','start'],['ends','end'],['survives','survive'],['escapes','escape'],['faces','face'],['meets','meet'],['moves','move'],['drops','drop'],['climbs','climb'],['slides','slide'],['holds','hold'],['creates','create'],['shows','show']
]);

function nickname(teamName){return norm(teamName).split(/\s+/).filter(Boolean).at(-1)||''}
function isPluralTeam(teamName){
  const n=nickname(teamName);
  return /s$/i.test(n)||/49ers$/i.test(n);
}
function preserveCase(source,replacement){
  if(!source)return replacement;
  if(source===source.toUpperCase())return replacement.toUpperCase();
  if(/^[A-Z]/.test(source))return replacement.charAt(0).toUpperCase()+replacement.slice(1);
  return replacement;
}

export function normalizeInquirerForwardHeadline(headline,teamNames=[]){
  let h=norm(headline);if(!h)return h;
  const names=[...new Set((teamNames||[]).map(norm).filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(const name of names){
    if(!isPluralTeam(name))continue;
    const re=new RegExp(`^(${esc(name)})\\s+([A-Za-z]+)\\b`,'i'),m=h.match(re);
    if(!m)continue;
    const replacement=PLURAL_VERBS.get(String(m[2]||'').toLowerCase());
    if(replacement)h=h.replace(re,`${m[1]} ${preserveCase(m[2],replacement)}`);
    break;
  }
  h=h
    .replace(/\b(Make|Makes|Made) the Week (\d+) Look\b/g,'$1 Week $2 Look')
    .replace(/\b(Ruin|Ruins|Ruined) ([^;,:]+?)[’'] This Sunday\b/g,'$1 $2’ Sunday')
    .replace(/\bTwo Weeks of result\b/gi,'Two Weeks of Results')
    .replace(/\bweeks? of result\b/gi,m=>m.replace(/result/i,'results'));
  return norm(h);
}

export function normalizeInquirerForwardHeadlines(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const names=edition.teams.map(t=>String(t?.team_name||'')).filter(Boolean);
  for(const team of edition.teams){const a=team?.inquirer_article;if(a)a.headline=normalizeInquirerForwardHeadline(a.headline,names)}
  if(edition.league_overview?.headline)edition.league_overview.headline=normalizeInquirerForwardHeadline(edition.league_overview.headline,names);
  return edition;
}

export function findInquirerForwardHeadlineGrammarIssues(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return[];
  const issues=[],names=edition.teams.map(t=>String(t?.team_name||'')).filter(Boolean).sort((a,b)=>b.length-a.length);
  for(const team of edition.teams){
    const h=norm(team?.inquirer_article?.headline);if(!h)continue;
    for(const name of names){
      if(!isPluralTeam(name))continue;
      const m=h.match(new RegExp(`^${esc(name)}\\s+([A-Za-z]+)\\b`,'i'));
      if(m&&PLURAL_VERBS.has(String(m[1]).toLowerCase()))issues.push({team:String(team?.team_name||''),headline:h,reason:`plural team subject uses singular verb ${m[1]}`});
      if(m)break;
    }
    if(/\b(?:Make|Makes|Made) the Week \d+ Look\b/i.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward “make the Week N look” phrasing'});
    if(/\bweeks? of result\b/i.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward result/result(s) phrasing'});
    if(/[’'] This Sunday\b/.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward possessive This Sunday phrasing'});
    if(/\b(?:bank|take|lose|leave|make|fall|have|keep|win|turn|spill|ruin)\b/.test(h)&&new RegExp(`^(?:${names.map(esc).join('|')})\\s+[a-z]`).test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'corrected headline verb lost title capitalization'});
  }
  return issues;
}
