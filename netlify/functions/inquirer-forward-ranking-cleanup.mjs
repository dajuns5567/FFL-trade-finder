// The forward quality parser treats periods as sentence boundaries. Normalize
// ranking abbreviations so phrases such as "No. 4 in the league order" cannot
// become fake standalone fragments like "4 in the league order." during audit.

const fix=v=>String(v||'')
  .replace(/\branked\s+No\.\s*(\d+)/gi,'ranked $1')
  .replace(/\bNo\.\s*(\d+)/gi,'number $1')
  .replace(/\s+/g,' ')
  .trim();

function fixArticle(a){
  if(!a)return;
  for(const s of a.sections||[]){
    if(Array.isArray(s?.paragraphs))s.paragraphs=s.paragraphs.map(fix).filter(Boolean);
    for(const b of s?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=b.paragraphs.map(fix).filter(Boolean);
  }
  if(a.headline)a.headline=fix(a.headline);
  if(a.deck)a.deck=fix(a.deck);
  if(a.aside)a.aside=fix(a.aside);
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}

export function cleanupInquirerForwardRankings(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  for(const t of edition.teams)fixArticle(t?.inquirer_article);
  const o=edition.league_overview;
  if(o){
    for(const s of o.sections||[]){
      if(Array.isArray(s?.paragraphs))s.paragraphs=s.paragraphs.map(fix).filter(Boolean);
      for(const b of s?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=b.paragraphs.map(fix).filter(Boolean);
    }
    for(const h of o.hot_takes||[]){if(h?.title)h.title=fix(h.title);if(h?.take)h.take=fix(h.take)}
    if(o.headline)o.headline=fix(o.headline);
    if(o.deck)o.deck=fix(o.deck);
  }
  return edition;
}
