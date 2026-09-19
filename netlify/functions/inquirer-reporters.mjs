'use strict';

export const INQUIRER_VERSION=9;

export const REPORTERS=[
 {id:'walter-mercer',name:'Walter Mercer',title:'Senior Football Correspondent',desk:'The Old Desk',voice:'Old-school beat writer. Clipped sentences. Scoreboard first. Dry skepticism. Sounds like ink, coffee, and a deadline.',signature:'No hysteria without a box score.'},
 {id:'tess-delaney',name:'Tess Delaney',title:'Performance & Tactics Columnist',desk:'The Numbers Desk',voice:'Sharp analytical columnist. Precise, observant, mildly sarcastic. Treats projections, usage, efficiency, and lineup choices like evidence.',signature:'The numbers are allowed to be rude.'},
 {id:'mack-hollis',name:'Mack Hollis',title:'Tabloid Sports Editor',desk:'The Back Page',voice:'Boisterous tabloid sports voice. Punchy. Braggy when deserved, mocking when earned, dramatic without inventing facts.',signature:'If it happened, it belongs in 48-point type.'},
 {id:'nora-voss',name:'Nora Voss',title:'Investigations & Front Office',desk:'The Inquiry Desk',voice:'Sardonic investigative columnist. Forensic about roster decisions and transactions. Darker dry humor, suspicious of easy narratives.',signature:'Every lineup leaves fingerprints.'}
];

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const one=v=>Number(v||0).toFixed(1);
const reporterPublic=r=>({id:r.id,name:r.name,title:r.title,desk:r.desk,voice:r.voice,signature:r.signature});
export function publicReporters(){return REPORTERS.map(reporterPublic)}

export function reporterForTeam(rosterId,week,rosterIds=[]){
 const ids=[...new Set((rosterIds||[]).map(String))].sort((a,b)=>(Number(a)-Number(b))||a.localeCompare(b));
 let teamIndex=ids.indexOf(String(rosterId));
 if(teamIndex<0){const n=Number(rosterId);teamIndex=Number.isFinite(n)?Math.max(0,n-1):0}
 const reporterIndex=((teamIndex+Math.max(0,Number(week||1)-1))%REPORTERS.length+REPORTERS.length)%REPORTERS.length;
 return REPORTERS[reporterIndex];
}

export function weeklyStatsMap(raw){
 const out={};
 if(Array.isArray(raw)){for(const row of raw||[]){const id=String(row?.player_id||row?.player?.player_id||row?.id||'');if(id)out[id]=row?.stats&&typeof row.stats==='object'?row.stats:row}return out}
 if(raw&&typeof raw==='object')for(const [id,row] of Object.entries(raw))out[String(id)]=row?.stats&&typeof row.stats==='object'?row.stats:row;
 return out;
}

const first=(s,...keys)=>{for(const k of keys){const n=num(s?.[k]);if(n!=null)return n}return null};
const push=(a,v,label)=>{if(v!=null)a.push(String(v)+' '+label)};

export function realStatLine(position,stats){
 const p=String(position||'').toUpperCase(),s=stats||{},parts=[];
 if(p==='QB'){
  const cmp=first(s,'pass_cmp'),att=first(s,'pass_att'),yd=first(s,'pass_yd'),td=first(s,'pass_td'),ints=first(s,'pass_int');
  if(cmp!=null||att!=null)parts.push(String(cmp??0)+'/'+String(att??0)+' passing');
  if(yd!=null)parts.push(String(yd)+' pass yds');if(td!=null)parts.push(String(td)+' pass TD');if(ints!=null)parts.push(String(ints)+' INT');
  const ra=first(s,'rush_att'),ry=first(s,'rush_yd'),rt=first(s,'rush_td');if(ra!=null||ry!=null||rt!=null)parts.push(String(ra??0)+' carries, '+String(ry??0)+' rush yds'+(rt?', '+rt+' rush TD':''));
 }else if(p==='RB'||p==='FB'){
  const ra=first(s,'rush_att'),ry=first(s,'rush_yd'),rt=first(s,'rush_td');if(ra!=null||ry!=null||rt!=null)parts.push(String(ra??0)+' carries, '+String(ry??0)+' rush yds'+(rt?', '+rt+' rush TD':''));
  const rec=first(s,'rec'),tgt=first(s,'rec_tgt','targets'),rY=first(s,'rec_yd'),rT=first(s,'rec_td');if(rec!=null||tgt!=null||rY!=null||rT!=null)parts.push(String(rec??0)+'/'+String(tgt??0)+' rec, '+String(rY??0)+' rec yds'+(rT?', '+rT+' rec TD':''));
 }else if(p==='WR'||p==='TE'){
  const rec=first(s,'rec'),tgt=first(s,'rec_tgt','targets'),rY=first(s,'rec_yd'),rT=first(s,'rec_td');if(rec!=null||tgt!=null||rY!=null||rT!=null)parts.push(String(rec??0)+'/'+String(tgt??0)+' rec, '+String(rY??0)+' yds'+(rT?', '+rT+' TD':''));
  const ra=first(s,'rush_att'),ry=first(s,'rush_yd'),rt=first(s,'rush_td');if(ra!=null||ry!=null||rt!=null)parts.push(String(ra??0)+' carries, '+String(ry??0)+' rush yds'+(rt?', '+rt+' rush TD':''));
 }else if(p==='K'){
  const fg=first(s,'fgm'),fga=first(s,'fga'),xp=first(s,'xpm'),xpa=first(s,'xpa');if(fg!=null||fga!=null)parts.push(String(fg??0)+'/'+String(fga??0)+' FG');if(xp!=null||xpa!=null)parts.push(String(xp??0)+'/'+String(xpa??0)+' XP');
 }else{
  push(parts,first(s,'tkl_solo','idp_tkl_solo'),'solo');push(parts,first(s,'tkl_ast','idp_tkl_ast'),'ast');push(parts,first(s,'sack','idp_sack'),'sacks');push(parts,first(s,'tkl_loss','idp_tkl_loss'),'TFL');push(parts,first(s,'qb_hit','idp_qb_hit'),'QB hits');push(parts,first(s,'int','idp_int'),'INT');push(parts,first(s,'ff','idp_ff'),'FF');push(parts,first(s,'fum_rec','idp_fum_rec'),'FR');push(parts,first(s,'pass_def','idp_pass_def'),'PD');
 }
 return parts.filter(Boolean).slice(0,5).join(' • ');
}

function fact(p){
 if(!p)return'No verified player detail was available.';
 const fp=Number.isFinite(Number(p.points))?one(p.points)+' fantasy pts':'fantasy points unavailable';
 return p.name+' — '+fp+'; '+(String(p.real_stat_line||'').trim()||'Sleeper returned no usable real-life stat line');
}
function aside(t,w,r){
 const pools={
  'walter-mercer':['The press box has filed this under “worth remembering, not worth engraving.”','The old rule applies: keep the clipping, lose the parade route.','A veteran copy editor has already circled the result twice and the excuses zero times.'],
  'tess-delaney':['The spreadsheet has no emotional attachment to anyone involved.','Regression remains undefeated, which is inconvenient for victory-lap scheduling.','The model would like everyone to stop confusing one week with a constitution.'],
  'mack-hollis':['Somebody in circulation has already ordered larger headline type.','The back page is behaving irresponsibly, as tradition requires.','Local authorities have not confirmed whether the victory cigar violated indoor policy.'],
  'nora-voss':['The evidence has been bagged, tagged, and placed beside the waiver wire.','No subpoenas have been issued, but the lineup card has been retained.','The front office may consider this paragraph an informal request for comment.']
 };
 const a=pools[r.id]||pools['walter-mercer'];let h=0;for(const ch of String(t.manager_name||t.roster_id)+String(w)+r.id)h=(h*33+ch.charCodeAt(0))>>>0;return a[h%a.length];
}
function txText(t,facts){
 const tx=t.transactions||[];if(!tx.length)return 'GM '+t.manager_name+' made no recorded transaction this week. No move will be invented to fill the space.';
 const bits=[];for(const move of tx.slice(0,3)){for(const id of move.adds||[])if(facts[id])bits.push('added '+fact(facts[id]));for(const id of move.drops||[])if(facts[id])bits.push('dropped '+fact(facts[id]))}
 return 'GM '+t.manager_name+' logged '+tx.length+' transaction'+(tx.length===1?'': 's')+(bits.length?': '+bits.slice(0,4).join('; '):'.');
}
function headline(t,w,r){
 const score=one(t.points)+'–'+one(t.opponent_points);
 if(r.id==='walter-mercer')return t.won?t.team_name+' BANKS WEEK '+w+', '+score:t.team_name+' LEFT COUNTING THE COST AFTER '+score+' LOSS';
 if(r.id==='tess-delaney')return t.won?'The Margin Had a Method: '+t.team_name+' Wins '+score:'The Numbers Turned: '+t.team_name+' Falls '+score;
 if(r.id==='mack-hollis')return t.won?'EXTRA! '+t.team_name+' KICKS DOWN THE DOOR, '+score+'!':'RED INK! '+t.team_name+' TAKES A '+score+' HIT';
 return t.won?'The Evidence Board: How '+t.team_name+' Won '+score:'The Evidence Board: Where '+t.team_name+' Lost '+score;
}
function intro(t,w,r){
 const d=Number(t.points)-Number(t.projected),proj=Number.isFinite(Number(t.projected))?Math.abs(d).toFixed(1)+' points '+(d>=0?'above':'below')+' Sleeper projection':'with no reliable projection comparison';
 if(r.id==='walter-mercer')return 'Week '+w+'. Final: '+t.team_name+' '+(t.won?'over':'under')+' the opposition, '+one(t.points)+'–'+one(t.opponent_points)+'. They finished '+proj+'. That is the scorebook. Everything else is interpretation.';
 if(r.id==='tess-delaney')return t.team_name+' finished Week '+w+' at '+one(t.points)+' fantasy points against '+one(t.opponent_points)+', '+proj+'. The result matters; the gap between expectation and production tells us why.';
 if(r.id==='mack-hollis')return (t.won?'Sound the presses':'Stop the presses')+': '+t.team_name+' put '+one(t.points)+' on the board while the opponent posted '+one(t.opponent_points)+'. They landed '+proj+'. The back page has opinions.';
 return 'The Week '+w+' file on '+t.team_name+' closes at '+one(t.points)+'–'+one(t.opponent_points)+', '+(t.won?'a win':'a loss')+', and '+proj+'. The useful question is which fingerprints are actually on the result.';
}
function playersParagraph(t,r){
 const rows=(t.starter_details||[]).slice(),top=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2),low=rows.slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],stars=top.map(fact).join(' | '),lowFact=low?fact(low):'No verified low starter detail was available.';
 if(r.id==='walter-mercer')return 'Game book: '+(stars||'No verified starter production was available.')+' The low return: '+lowFact;
 if(r.id==='tess-delaney')return 'Production leaders: '+(stars||'No verified starter production was available.')+' Lowest starter output: '+lowFact+' Fantasy points and the real stat line belong in the same sentence.';
 if(r.id==='mack-hollis')return 'Stars of the screaming headline: '+(stars||'No verified starter production was available.')+' And down in the tiny legal print: '+lowFact;
 return 'Exhibit A: '+(stars||'No verified starter production was available.')+' Exhibit B, the lowest starter return: '+lowFact+' The numbers are entered without alibi or embellishment.';
}
function outlook(t,w,r){
 const div=t.division_results||[],wins=div.filter(x=>x.won).length,next=t.next_opponent_roster_id?'Next: '+t.next_opponent_name+'. ':'Sleeper has not supplied a next opponent, so none will be invented. ',division=div.length?wins+' of '+div.length+' other division teams won in Week '+w+'.':'No complete divisional comparison was available.';
 if(r.id==='walter-mercer')return next+division+' One week is a result. A run of them becomes a season.';
 if(r.id==='tess-delaney')return next+division+' The next test is whether this week’s usage and production repeat, not whether the headline does.';
 if(r.id==='mack-hollis')return next+division+' The presses will be warmed up either way.';
 return next+division+' The file stays open until the pattern becomes evidence.';
}

export function buildInquirerWeek({season,week,teams,players,weeklyStats,scoringSettings,scoreFn}){
 const ids=(teams||[]).map(t=>String(t.roster_id)).sort((a,b)=>(Number(a)-Number(b))||a.localeCompare(b)),raw=weeklyStatsMap(weeklyStats),facts={},meta=players||{},needed=new Set();
 for(const t of teams||[]){for(const p of t.starter_details||[])needed.add(String(p.id));for(const move of t.transactions||[]){for(const id of move.adds||[])needed.add(String(id));for(const id of move.drops||[])needed.add(String(id))}}
 for(const id of needed){const m=meta[id]||{},stats=raw[id]||{},position=String(m.position||m.fantasy_positions?.[0]||'FLEX'),name=String(m.full_name||((m.first_name||'')+' '+(m.last_name||'')).trim()||id),fp=typeof scoreFn==='function'?scoreFn(stats,scoringSettings):null;facts[id]={id,name,position,nfl_team:String(m.team||'FA'),points:Number.isFinite(Number(fp))?Number(fp):null,real_stat_line:realStatLine(position,stats)}}
 const enriched=(teams||[]).map(t=>{const reporter=reporterForTeam(t.roster_id,week,ids),starters=(t.starter_details||[]).map(p=>({...p,real_stat_line:facts[String(p.id)]?.real_stat_line||'',real_stats_available:!!facts[String(p.id)]?.real_stat_line})),tt={...t,starter_details:starters},article={schema_version:1,inquirer_version:INQUIRER_VERSION,season:Number(season),week:Number(week),roster_id:String(t.roster_id),reporter:reporterPublic(reporter),headline:headline(tt,week,reporter),byline:'By '+reporter.name+', '+reporter.title,deck:reporter.desk+' • '+reporter.signature,paragraphs:[intro(tt,week,reporter),playersParagraph(tt,reporter),txText(tt,facts),outlook(tt,week,reporter)],aside:aside(tt,week,reporter),generated_from:'Sleeper completed matchup, projection, transaction, roster, player metadata, and raw weekly stats',real_stats_source:'Sleeper weekly stats',facts:{team_points:Number(tt.points),opponent_points:Number(tt.opponent_points),projected:Number(tt.projected),starter_details:starters}};return{...tt,inquirer_article:article,reporter_id:reporter.id}});
 return{reporters:publicReporters(),teams:enriched};
}
