// Source-grounded compositional voice engine for every future Inquirer edition.
// Vocabulary, rhetoric, grammar, reporting lens and syntax vary independently.
// No static list of twelve completed introductions; no fabricated football facts.
export const COMPOSITIONAL_VOICE_CONTRACT=1;
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(xs,k)=>xs[hash(k)%xs.length];
const fmt=v=>Number(v).toFixed(1);
const valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const norm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const head=s=>norm(s).split(' ').slice(0,9).join(' ');
// Detect the rhetorical opening shape, without treating different names or scores
// as a new style. Only the recent archive constrains cadence; it can evolve.
const cadence=s=>norm(s).replace(/\b\d+\b/g,'number').split(' ').slice(0,5).join(' ');
const wc=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const entity=(team)=>({club:String(team.team_name||''),foe:String(team.opponent_name||''),points:fmt(team.points),
 against:fmt(team.opponent_points),low:(team.starter_details||[]).filter(x=>x.name&&valid(x.points)).sort((a,b)=>Number(a.points)-Number(b.points))[0]});
const available=team=>team?.team_name&&team?.opponent_name&&valid(team.points)&&valid(team.opponent_points);
const voices={
 'walter-mercer':{setting:['the official record','the annotated scorecard','the press-room transcript','the Sunday ledger','the scorer’s notebook','the final box score','the evidence file','the postgame accounting','the public score sheet','the archival ledger'],
  irony:['the numbers have declined to issue a correction','the official ledger offers no sympathetic interpretation','the evidence does not respond to public relations','the final score is indifferent to spin','the figures are not accepting appeals','the box score is not giving interviews','the scorekeeper appears unimpressed','the arithmetic has declined a second opinion','the official account needs no exaggeration','the calculator refuses to testify for the defense']},
 'tess-delaney':{setting:['the runway review','the postgame fitting','the style desk','the Sunday ensemble','the scoring lookbook','the wardrobe inspection','the final runway','the closing-night review','the scoreboard spotlight','the fashion column'],
  irony:['the scoreboard declined to applaud the styling','there is no store credit for missing fantasy points','the tailoring cannot hide that number','the total is not flattering from any angle','the presentation will not survive a closer fitting','better lighting does not improve the figure','the stylist cannot edit the receipt','the fantasy scoreboard was not taking requests','the outfit and the points are having separate conversations','a second look only makes that number more conspicuous']},
 'mack-hollis':{setting:['the excuse department','the starting-card audit','the no-nonsense ledger','the scoreboard interrogation','the management cross-examination','the Monday complaint desk','the arithmetic tribunal','the roster accounting','the cold calculation','the postgame interrogation'],
  irony:['the calculator has requested a transfer','the excuse machine is running out of fuel','management should save the motivational poster','the numbers have already answered the question','the game does not award points for explaining it','another press conference will not recover the points','the lineup owes someone an apology','the final column is not interested in a pep talk','the scorekeeper has exhausted the sympathy budget','the argument gets weaker every time the score is read aloud']},
 'nora-voss':{setting:['the imaginary group chat','the fictional gossip desk','the rumor column','the league grapevine','the unofficial screenshot collection','the Monday whisper network','the imaginary fan hotline','the message-board press box','the fantasy chat log','the spectator gallery'],
  irony:['the screenshot needs no invented caption','everyone can read the decimal without an anonymous source','the group chat has enough material already','the score is doing all of the talking','the evidence has escaped into the open','there is no need to manufacture a scandal','the box score beat the rumor mill to publication','the points told the story without an insider tip','the gossip desk has decided not to embellish it','the numbers were indiscreet all by themselves']}
};
const verbs=['recorded','posted','registered','produced','logged','tallied','supplied','contributed','put on the board','turned in','delivered','finished with','offered up','ended with','notched','accounted for'];
const references=['a stubborn decimal','a rather awkward figure','a scorecard footnote','an inconvenient statistic','a conspicuous number','a very public line item','an unhelpful receipt','a memorable scoring detail','an unwelcome exhibit','a box-score complication'];
const frames=[
 p=>p.club+' '+p.verb+' '+p.points+' against '+p.foe+', while '+p.player+' registered '+p.low+'. In '+p.setting+', that is '+p.reference+'; '+p.irony+'.',
 p=>p.player+' '+p.verb+' '+p.low+' for '+p.club+' in the '+p.foe+' matchup. The '+p.points+'-point team total makes it '+p.reference+'; '+p.irony+'.',
 p=>p.setting[0].toUpperCase()+p.setting.slice(1)+' begins with '+p.club+' at '+p.points+' against '+p.foe+'. '+p.player+' at '+p.low+' is '+p.reference+'; '+p.irony+'.',
 p=>'Against '+p.foe+', '+p.club+' '+p.verb+' '+p.points+'. '+p.player+' supplied '+p.low+', '+p.reference+' that '+p.setting+' cannot misplace; '+p.irony+'.',
 p=>'Put '+p.player+' at '+p.low+' beside '+p.club+' at '+p.points+' in '+p.setting+'. The '+p.foe+' matchup supplies the context; '+p.irony+'.',
 p=>'For '+p.club+', '+p.player+' '+p.verb+' '+p.low+' while the team ended at '+p.points+' versus '+p.foe+'. That is '+p.reference+' in '+p.setting+'; '+p.irony+'.',
 p=>'The '+p.points+' by '+p.club+' against '+p.foe+' includes '+p.reference+': '+p.player+' at '+p.low+'. Read '+p.setting+' carefully: '+p.irony+'.',
 p=>p.club+' faced '+p.foe+' and '+p.verb+' '+p.points+', with '+p.player+' at '+p.low+'. '+p.setting[0].toUpperCase()+p.setting.slice(1)+' takes note; '+p.irony+'.'
];
const previousLines=history=>history.filter(Boolean).flatMap(e=>[
 ...(e.teams||[]).flatMap(t=>t.inquirer_article?.paragraphs||[]),
 ...(e.league_overview?.sections||[]).flatMap(s=>s.blocks?.length?s.blocks.flatMap(b=>b.paragraphs||[]):s.paragraphs||[])
]).flatMap(s=>String(s||'').split(/(?<=[.!?])\s+/));
export function reinforceForwardReporterVoice(teams,week,salt=0,history=[],season=2026){
 if(Number(season)<=2026&&Number(week)<10)return teams;
 const archive=previousLines(history),old=new Set(archive.map(norm)),open=new Set(archive.map(head)),used=new Set(),starts=new Set(),voicePunchlines=new Set();
 for(const t of teams||[]){
  const a=t?.inquirer_article,subject=available(t)&&entity(t);
  if(!a?.sections?.length||!subject?.low)continue;
  const reaction=a.sections.find(s=>s.kind==='sentiment');if(!reaction?.paragraphs?.length)continue;
  const existing=wc(a.sections.flatMap(s=>s.paragraphs||[]).join(' '));
  if(existing>585)continue;
  const voice=voices[a.reporter?.id]||voices['walter-mercer'];
  const desks=[reaction],management=a.sections.find(s=>s.kind==='management');
  if(management?.paragraphs?.length&&existing<470)desks.push(management);
  for(let di=0;di<desks.length;di++){
   for(let attempt=0;attempt<512;attempt++){
    const seed=[week,salt,t.roster_id,di,attempt,a.reporter?.id].join('|');
    const p={...subject,player:subject.low.name,low:fmt(subject.low.points),
     setting:pick(voice.setting,seed+'s'),irony:pick(voice.irony,seed+'i'),
     verb:pick(verbs,seed+'v'),reference:pick(references,seed+'r')};
    const line=pick(frames,seed+'f')(p),full=norm(line),first=head(line);
    const punchlineKey=[a.reporter?.id||'walter-mercer',di,p.irony].join('|');
    if(old.has(full)||used.has(full)||open.has(first)||starts.has(first)||voicePunchlines.has(punchlineKey))continue;
    desks[di].paragraphs.push(line);used.add(full);starts.add(first);voicePunchlines.add(punchlineKey);break;
   }
  }
  a.paragraphs=a.sections.flatMap(s=>s.paragraphs||[]);
 }
 return teams;
}
const recapVocabulary={
 prefix:['The completed-week ledger','The finalized fantasy scores','The Sunday archive','The league scoreboard','The matchup record','The Sunday evidence','The scoring summary','The week’s full-league account','The scorekeeper’s notes','The week’s finished numbers','The opening evidence','The final fantasy totals','The morning-after accounting','The finished score sheet'],
 action:['records','sets out','opens with','leads with','puts forward','documents','frames','features','prints','makes room for','sets down','presents','files','places on the page'],
 bridge:['Before the argument starts,','With scoring now final,','Ahead of the next debate,','Rather than inventing a headline,','Before managers write their defenses,','Without a fictional insider in sight,','Once the last matchup closed,','Before the group chat exaggerates,','After Sunday finished the arithmetic,','In the interest of unfashionable accuracy,'],
 reaction:['The points are not accepting appeals.','No one has to like a figure for it to count.','The spin department cannot edit those numbers.','An explanation is not a scoring category.','The box score already has the last word.','The group chat can keep the theories; the totals remain.','There are no style points for arguing with arithmetic.','The next disagreement should at least begin with that evidence.','The fantasy scoreboard was not taking requests.','A softer adjective would not change the final score.','Those decimals have been remarkably indiscreet.','The league can now resume debating reality without improving on it.','The calculation is doing the sarcastic work itself.','The scoreboard has neglected everyone’s feelings.'],
 focus:['a completed matchup','the loudest Sunday total','the narrowest finished score','the widest completed margin','the middle of the league table','a number the league cannot unsee','a recorded contrast worth examining','the least comfortable final total','a result that outlived the predictions','an entry nobody can rewrite']
};
// The grammatical subject and verb are composed independently; inflect the
// action after selection, so plurality survives every vocabulary combination.
const recapPluralPrefixes=new Set([
 'The finalized fantasy scores','The scorekeeper’s notes',
 'The week’s finished numbers','The final fantasy totals'
]);
const pluralRecapAction=action=>{
 const forms={'records':'record','sets out':'set out','opens with':'open with',
  'leads with':'lead with','puts forward':'put forward','documents':'document',
  'frames':'frame','features':'feature','prints':'print','makes room for':'make room for',
  'sets down':'set down','presents':'present','files':'file','places on the page':'place on the page'};
 return forms[action]||action;
};
const leadFrames=[
 p=>p.bridge+' '+p.club+' scored '+p.score+' against '+p.foe+' in Week '+p.week+'. '+p.reaction,
 p=>'For Week '+p.week+', '+p.prefix.toLowerCase()+' '+p.action+' '+p.club+' at '+p.score+' versus '+p.foe+'. '+p.reaction,
 p=>'Start with '+p.club+': '+p.score+' against '+p.foe+' in Week '+p.week+'. '+p.reaction,
 p=>p.bridge+' '+p.focus+' belongs to '+p.club+' ('+p.score+'–'+p.against+' against '+p.foe+'). '+p.reaction,
 p=>p.prefix+' '+p.action+' '+p.club+' against '+p.foe+' at '+p.score+'–'+p.against+'. '+p.reaction,
 p=>'A finished Week '+p.week+' score of '+p.score+' from '+p.club+' against '+p.foe+' is a useful place to begin. '+p.reaction,
 p=>'Do not decorate '+p.club+' and '+p.score+' against '+p.foe+' in Week '+p.week+'. '+p.reaction,
 p=>p.bridge+' consider '+p.club+' and the '+p.score+' recorded against '+p.foe+'. '+p.reaction,
 p=>'The first exhibit from Week '+p.week+': '+p.club+' on '+p.score+', '+p.foe+' on '+p.against+'. '+p.reaction,
 p=>'For Week '+p.week+', '+p.prefix.toLowerCase()+' '+p.action+' '+p.club+' and '+p.score+' versus '+p.foe+'. '+p.reaction
];
export function rotateForwardRecapOpening(overview,teams,week,salt=0,history=[],season=Number(overview?.season)||2026){
 if(Number(season)<=2026&&Number(week)<10)return overview;
 const feature=(overview?.sections||[]).find(s=>(s.blocks||[]).some(b=>b.kind==='lead')),
 lead=feature?.blocks?.find(b=>b.kind==='lead');
 if(!lead?.paragraphs?.length)return overview;
 const rows=(teams||[]).filter(available).slice(),byScore=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points));
 const byGap=rows.slice().sort((a,b)=>Math.abs(Number(b.points)-Number(b.opponent_points))-Math.abs(Number(a.points)-Number(a.opponent_points)));
 const subjects=[byScore[0],byScore.at(-1),byGap[0],byGap.at(-1),byScore[Math.floor(byScore.length/2)],byScore[1],byScore.at(-2)].filter(Boolean);
 if(!subjects.length)return overview;
 const past=history.filter(Boolean).flatMap(e=>(e.league_overview?.sections||[]).flatMap(s=>
  (s.blocks||[]).filter(b=>b.kind==='lead').map(b=>b.paragraphs?.[0]).filter(Boolean)));
 const old=new Set(past.map(norm)),starts=new Set(past.map(head)),recentCadences=new Set(past.slice(-6).map(cadence));
 for(let attempt=0;attempt<1024;attempt++){
  const seed=[week,salt,attempt,'recap',overview?.season||''].join('|');
  const t=pick(subjects,seed+'team'),p={week,club:t.team_name,foe:t.opponent_name,score:fmt(t.points),against:fmt(t.opponent_points)};
  for(const [field,bank] of Object.entries(recapVocabulary))p[field]=pick(bank,seed+field);
  if(recapPluralPrefixes.has(p.prefix))p.action=pluralRecapAction(p.action);
  const line=pick(leadFrames,seed+'structure')(p);
  if(old.has(norm(line))||starts.has(head(line))||recentCadences.has(cadence(line)))continue;
  lead.paragraphs[0]=line;
  feature.paragraphs=feature.blocks.flatMap(b=>b.paragraphs||[]);
  overview.paragraphs=overview.sections.flatMap(s=>s.paragraphs||[]);
  return overview;
 }
 return overview; // never invent a fallback or weaken independent editorial approval
}
