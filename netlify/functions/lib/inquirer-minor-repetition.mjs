// A narrowly scoped, auditable editorial tolerance for future Inquirer editions.
// Only one short, *exact* repeated sentence in four of 32 team articles qualifies.
// This never overrides independent structural, factual, recap or copy-review gates.
const tokens=value=>String(value||'').toLowerCase().match(/[a-z0-9]+/g)||[];
const sentences=article=>(article?.sections||[]).flatMap(section=>section?.paragraphs||[])
  .flatMap(paragraph=>String(paragraph||'')
    .replace(/\b(?:Jr|Sr|Dr|Mr|Mrs|Ms)\.(?=\s+[A-Z])/g,match=>match.replace('.','§'))
    .split(/(?<=[.!?])\s+/).map(sentence=>sentence.replaceAll('§','.')));
export function assessMinorNineWordReuse(teams,repeated){
 const collisions=[...(repeated||[])];
 if(!collisions.length||collisions.length>20)return{tolerated:false};
 const owners=new Set(collisions.flatMap(([,ids])=>[...ids].map(String)));
 if(owners.size!==4||collisions.some(([,ids])=>ids.size!==4))
  return{tolerated:false};
 const byTeam=new Map((teams||[]).map(team=>[
  String(team.roster_id),
  new Set(sentences(team.inquirer_article).map(sentence=>tokens(sentence))
   .filter(words=>words.length>=9&&words.length<=28)
   .map(words=>words.join(' ')))
 ]));
 if([...owners].some(id=>!byTeam.has(id)))return{tolerated:false};
 const [first,...others]=[...owners];
 const shared=[...byTeam.get(first)].filter(sentence=>others.every(id=>byTeam.get(id).has(sentence)));
 // Never waive a copied paragraph. Each occurrence must be one incidental
 // sentence embedded inside independently written, substantive surrounding prose.
 const embedded=(team,sentence)=>{
  const paragraphs=(team.inquirer_article?.sections||[]).flatMap(section=>section.paragraphs||[]);
  return paragraphs.some(paragraph=>{
   const parts=sentences({sections:[{paragraphs:[paragraph]}]});
   const occurrences=parts.filter(part=>tokens(part).join(' ')===sentence).length;
   const surrounding=parts.filter(part=>tokens(part).join(' ')!==sentence);
   return occurrences===1&&surrounding.length>=2&&
     surrounding.reduce((total,part)=>total+tokens(part).length,0)>=18;
  });
 };
 const matches=shared.filter(sentence=>{
  const padded=' '+sentence+' ';
  return collisions.every(([phrase])=>padded.includes(' '+phrase+' '))&&
    [...owners].every(id=>embedded((teams||[]).find(t=>String(t.roster_id)===id),sentence));
 });
 if(matches.length!==1)return{tolerated:false};
 return{tolerated:true,team_count:4,phrase_windows:collisions.length,
   sentence:matches[0].slice(0,190)};
}
