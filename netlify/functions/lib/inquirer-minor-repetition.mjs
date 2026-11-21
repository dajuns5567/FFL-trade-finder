// Small, auditable allowance for incidental repeated sentences in otherwise
// independently reported newspapers. NEVER waive long copy, factual, recap,
// structural, historical or unrelated editorial findings.
const tokens=value=>String(value||'').toLowerCase().match(/[a-z0-9]+/g)||[];
const sentences=article=>(article?.sections||[]).flatMap(section=>section?.paragraphs||[])
 .flatMap(paragraph=>String(paragraph||'')
   .replace(/\b(?:Jr|Sr|Dr|Mr|Mrs|Ms)\.(?=\s+[A-Z])/g,match=>match.replace('.','§'))
   .split(/(?<=[.!?])\s+/).map(sentence=>sentence.replaceAll('§','.')));
const sentenceCounts=team=>{
 const counts=new Map();
 for(const line of sentences(team?.inquirer_article)){
  const words=tokens(line);
  if(words.length<9||words.length>28)continue;
  const norm=words.join(' ');
  counts.set(norm,(counts.get(norm)||0)+1);
 }
 return counts;
};
const embedded=(team,sentence)=>{
 const paragraphs=(team?.inquirer_article?.sections||[]).flatMap(section=>section.paragraphs||[]);
 return paragraphs.some(paragraph=>{
  const parts=sentences({sections:[{paragraphs:[paragraph]}]});
  const occurrences=parts.filter(part=>tokens(part).join(' ')===sentence).length;
  const surrounding=parts.filter(part=>tokens(part).join(' ')!==sentence);
  return occurrences===1&&surrounding.length>=2&&
   surrounding.reduce((total,part)=>total+tokens(part).length,0)>=18;
 });
};
export function assessMinorNineWordReuse(teams,repeated){
 const collisions=[...(repeated||[])];
 if(!collisions.length||collisions.length>40||!Array.isArray(teams)||teams.length!==32)
  return{tolerated:false};
 const byTeam=new Map(teams.map(team=>[String(team.roster_id),sentenceCounts(team)]));
 if(byTeam.size!==32)return{tolerated:false};
 const sentenceOwners=new Map();
 for(const [id,counts] of byTeam)for(const [sentence,count] of counts){
  if(count!==1)continue; // A repeated line within even one article is not incidental.
  const ids=sentenceOwners.get(sentence)||new Set();
  ids.add(id);sentenceOwners.set(sentence,ids);
 }
 const eligible=[...sentenceOwners].filter(([sentence,ids])=>ids.size>=4&&ids.size<=5&&
  [...ids].every(id=>embedded(teams.find(t=>String(t.roster_id)===id),sentence)));
 // Every flagged long-reuse window must be accounted for by one and only
 // one *complete* qualifying sentence with exactly the same affected teams.
 // Never suppress a collision merely because its substring occurs somewhere
 // inside an otherwise benign sentence shared by another group.
 const matches=new Map();
 for(const [rawPhrase,rawIds] of collisions){
  const phrase=tokens(rawPhrase).join(' '),ids=new Set([...rawIds].map(String));
  if(ids.size<4||ids.size>5)return{tolerated:false};
  const matching=eligible.filter(([sentence,owners])=>
   owners.size===ids.size&&[...owners].every(id=>ids.has(id))&&
   (' '+sentence+' ').includes(' '+phrase+' '));
  if(matching.length!==1)return{tolerated:false};
  matches.set(matching[0][0],matching[0][1]);
 }
 if(!matches.size||matches.size>3)return{tolerated:false};
 // Two repeated sentences back-to-back in ANY affected article represent
 // contiguous copied prose, even when each sentence is individually short.
 // Check the full article in reading order, including paragraph boundaries.
 const copied=new Set(matches.keys());
 for(const team of teams){
  const lines=sentences(team.inquirer_article).map(line=>tokens(line).join(' '));
  if(lines.some((line,i)=>i>0&&copied.has(line)&&copied.has(lines[i-1])))
   return{tolerated:false,reason:'consecutive-repeated-sentences'};
 }
 return{tolerated:true,severity:'editorial-warning',requires_improvement:true,
  reason:'Minor nonconsecutive repetition; not an endorsement of duplicated writing',
  team_count:new Set([...matches.values()].flatMap(ids=>[...ids])).size,
  phrase_windows:collisions.length,sentence_count:matches.size,
  sentences:[...matches.keys()].map(s=>s.slice(0,190)),
  sentence:[...matches.keys()][0].slice(0,190)};
}
