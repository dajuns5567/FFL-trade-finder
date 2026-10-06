// Week 3+ headline grammar normalization.
// Fantasy team names are often plural noun phrases (Chiefs, Ravens, 49ers, etc.)
// while several headline templates were written with singular verbs. Normalize
// only the leading team-name + verb construction and a few awkward week phrases;
// football facts, names and numbers remain untouched.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const PLURAL_VERBS=new Map([
  ['banks','bank'],
  ['takes','take'],
  ['loses','lose'],
  ['leaves','leave'],
  ['makes','make'],
  ['falls','fall'],
  ['has','have'],
  ['keeps','keep'],
  ['wins','win'],
  ['turns','turn'],
  ['spills','spill'],
  ['ruins','ruin'],
  ['puts','put'],
  ['gets','get'],
  ['gives','give'],
  ['raises','raise'],
  ['needs','need'],
  ['owns','own'],
  ['looks','look'],
  ['stays','stay'],
  ['lands','land'],
  ['carries','carry'],
  ['finds','find'],
  ['starts','start'],
  ['ends','end'],
  ['survives','survive'],
  ['escapes','escape'],
  ['faces','face'],
  ['meets','meet'],
  ['moves','move'],
  ['drops','drop'],
  ['climbs','climb'],
  ['slides','slide'],
  ['holds','hold'],
  ['creates','create'],
  ['shows','show']
]);

function nickname(teamName){return norm(teamName).split(/\s+/).filter(Boolean).at(-1)||''}
function isPluralTeam(teamName){
  const n=nickname(teamName);
  // Every current league nickname ending in s/ers is intended as a plural club
  // name, including custom names such as Billiards, Bungals, Doncos and Aints.
  return /s$/i.test(n)||/49ers$/i.test(n);
}
function capitalizeSunday(s){return s.replace(/\bthis Sunday\b/g,'This Sunday')}

export function normalizeInquirerForwardHeadline(headline,teamNames=[]){
  let h=norm(headline);if(!h)return h;
  const names=[...new Set((teamNames||[]).map(norm).filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(const name of names){
    if(!isPluralTeam(name))continue;
    const re=new RegExp(`^(${esc(name)})\\s+([A-Za-z]+)\\b`,'i'),m=h.match(re);
    if(!m)continue;
    const replacement=PLURAL_VERBS.get(String(m[2]||'').toLowerCase());
    if(replacement)h=h.replace(re,`${m[1]} ${replacement}`);
    break;
  }
  h=h
    .replace(/\bthe Week (\d+)\b/g,'Week $1')
    .replace(/\bTwo Weeks of result\b/gi,'Two Weeks of Results')
    .replace(/\bweeks? of result\b/gi,m=>m.replace(/result/i,'results'));
  return capitalizeSunday(norm(h));
}

export function normalizeInquirerForwardHeadlines(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const names=edition.teams.map(t=>String(t?.team_name||'')).filter(Boolean);
  for(const team of edition.teams){
    const a=team?.inquirer_article;if(!a)continue;
    a.headline=normalizeInquirerForwardHeadline(a.headline,names);
  }
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
    if(/\bthe Week \d+\b/i.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward “the Week N” phrasing'});
    if(/\bweeks? of result\b/i.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'awkward result/result(s) phrasing'});
    if(/\bthis Sunday\b/.test(h))issues.push({team:String(team?.team_name||''),headline:h,reason:'lowercase this Sunday in title'});
  }
  return issues;
}
