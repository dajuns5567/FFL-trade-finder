'use strict';

export const INQUIRER_VERSION=13;

export const REPORTERS=[
 {id:'walter-mercer',name:'Nick Swindell',title:'Senior Football Correspondent',desk:'The Old Desk',voice:'Hometown old-school beat writer and obvious fan. Clipped sentences, dry sarcasm, institutional memory, mild contempt for excuses, and the confidence of someone who has watched this team ruin perfectly good Sundays before.',signature:'No hysteria without a box score.'},
 {id:'tess-delaney',name:'Bartholomew Roycington III',title:'Performance & Tactics Columnist',desk:'The Numbers Desk',voice:'Hometown analytics beat writer and fan. Precise but snarky, treats projections and usage like evidence, enjoys being right about trends, and gets personally offended when the team ignores the obvious numbers.',signature:'The numbers are allowed to be rude.'},
 {id:'mack-hollis',name:'Tilly Fleecer',title:'Tabloid Sports Editor',desk:'The Back Page',voice:'Hometown tabloid beat writer and unapologetic fan. Loud, funny, sarcastic, shamelessly celebratory after wins, merciless after dumb losses, and always looking for the sentence that makes rival managers roll their eyes.',signature:'If it happened, it belongs in 48-point type.'},
 {id:'nora-voss',name:'Jefferson Filch',title:'Investigations & Front Office',desk:'The Inquiry Desk',voice:'Hometown investigative beat writer and fan. Sardonic, suspicious, petty in a professional-looking way, forensic about lineup decisions and transactions, and convinced every bad roster move deserves a paper trail.',signature:'Every lineup leaves fingerprints.'}
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

function formText(p){
 const f=p?.recent_form;if(!f||Number(f.games)||0<3)return'';
 const last=Number(f.last3_avg),prior=Number(f.prior3_avg);
 if(f.label==='hot'&&Number.isFinite(last)&&Number.isFinite(prior))return ' He is also averaging '+one(last)+' over the last three after '+one(prior)+' over the previous three, which is the sort of trend this desk is legally required to overreact to.';
 if(f.label==='cold'&&Number.isFinite(last)&&Number.isFinite(prior))return ' He is down to '+one(last)+' per game over the last three from '+one(prior)+' over the previous three, which is not a slump so much as a tiny weekly tax on our happiness.';
 if(Number.isFinite(last))return ' His last-three average sits at '+one(last)+', which is neither parade material nor a reason to throw furniture.';
 return'';
}
function fact(p){
 if(!p)return'No verified player detail was available.';
 const fp=Number.isFinite(Number(p.points))?one(p.points)+' fantasy pts':'fantasy points unavailable';
 return p.name+' — '+fp+'; '+(String(p.real_stat_line||'').trim()||'Sleeper returned no usable real-life stat line')+formText(p);
}
function aside(t,w,r){
 const pools={
  'walter-mercer':['We have now reached the dangerous stage where this fan base begins saying “maybe” out loud.','The press box has upgraded the situation from “annoying” to “interesting,” which is as close to optimism as management allows.','Keep the clipping. Hide the parade route. We have been hurt before.'],
  'tess-delaney':['The spreadsheet says this is sustainable. The fan in me has asked the spreadsheet to please stop tempting fate.','The numbers are good enough that even the eye-test people have gone suspiciously quiet.','Regression remains undefeated, but for one week we are choosing not to invite it to dinner.'],
  'mack-hollis':['Someone find the rival group chat. We have irresponsible journalism to conduct.','The back page has abandoned neutrality and frankly feels terrific about it.','If this keeps up, circulation is going to become unbearable by choice.'],
  'nora-voss':['The lineup card has been entered into evidence, and several prior complaints are being quietly withdrawn.','No subpoenas yet, but the rival manager may want counsel.','The front office has requested that we stop calling this “evidence.” Request denied.']
 };
 const a=pools[r.id]||pools['walter-mercer'];let h=0;for(const ch of String(t.manager_name||t.roster_id)+String(w)+r.id)h=(h*33+ch.charCodeAt(0))>>>0;return a[h%a.length];
}
function txText(t,facts){
 const tx=t.transactions||[];
 if(!tx.length)return 'The front office recorded no move this week. Apparently GM '+t.manager_name+' looked at the waiver wire, folded the newspaper, and decided the roster could solve its own problems.';
 const bits=[];for(const move of tx.slice(0,3)){for(const id of move.adds||[])if(facts[id])bits.push('added '+fact(facts[id]));for(const id of move.drops||[])if(facts[id])bits.push('dropped '+fact(facts[id]))}
 return 'GM '+t.manager_name+' did at least leave fingerprints on the transaction log: '+tx.length+' move'+(tx.length===1?'':'s')+(bits.length?'. The notable business: '+bits.slice(0,4).join('; '):'. The paperwork exists even if the revolution does not.');
}
function headline(t,w,r){
 const score=one(t.points)+'–'+one(t.opponent_points),st=t?.league_context?.streak||{},run=Number(st.length)>=3?(st.type==='W'?Number(st.length)+' STRAIGHT':st.type==='L'?Number(st.length)+'-GAME SLIDE':''):'';
 if(r.id==='walter-mercer')return run?(t.team_name+' — '+run+' AFTER '+score):t.won?t.team_name+' BANKS WEEK '+w+', '+score:t.team_name+' LEFT COUNTING THE COST AFTER '+score+' LOSS';
 if(r.id==='tess-delaney')return run?(t.team_name+': The Data Behind '+run.replace('STRAIGHT','Straight').replace('GAME SLIDE','Game Slide')):t.won?'The Margin Had a Method: '+t.team_name+' Wins '+score:'The Numbers Turned: '+t.team_name+' Falls '+score;
 if(r.id==='mack-hollis')return run?(run+'! '+t.team_name+' OWNS THE BACK PAGE'):t.won?'EXTRA! '+t.team_name+' KICKS DOWN THE DOOR, '+score+'!':'RED INK! '+t.team_name+' TAKES A '+score+' HIT';
 return run?('The Evidence Board: '+t.team_name+' and the '+run.toLowerCase()):t.won?'The Evidence Board: How '+t.team_name+' Won '+score:'The Evidence Board: Where '+t.team_name+' Lost '+score;
}
function intro(t,w,r){
 const d=Number(t.points)-Number(t.projected),proj=Number.isFinite(Number(t.projected))?Math.abs(d).toFixed(1)+' points '+(d>=0?'above':'below')+' Sleeper projection':'with no reliable projection comparison',score=one(t.points)+'–'+one(t.opponent_points);
 if(r.id==='walter-mercer')return t.won?'Week '+w+'. Final: '+score+'. We won, we finished '+proj+', and for once nobody needs a 900-word explanation of what went wrong. Enjoy the rare administrative simplicity.':'Week '+w+'. Final: '+score+'. We lost and finished '+proj+'. There are cleaner ways to spend a Sunday, including several recognized dental procedures.';
 if(r.id==='tess-delaney')return t.won?'The numbers cooperated for once: '+t.team_name+' scored '+one(t.points)+', beat '+one(t.opponent_points)+', and finished '+proj+'. I would like to thank the roster for briefly respecting arithmetic.':t.team_name+' scored '+one(t.points)+' against '+one(t.opponent_points)+' and finished '+proj+'. The spreadsheet is not angry. Spreadsheets cannot be angry. I, however, have options.';
 if(r.id==='mack-hollis')return t.won?'SOUND THE PRESSES: '+t.team_name+' just hung '+one(t.points)+' on the board, won '+score+', and finished '+proj+'. Neutrality has been suspended until further notice.': 'STOP THE PRESSES: '+t.team_name+' lost '+score+' while finishing '+proj+'. The back page would like a refund and the name of whoever approved this experience.';
 return t.won?'Case closed, temporarily: '+t.team_name+' wins '+score+' and finishes '+proj+'. This desk has reviewed the evidence and, against long-standing instinct, finds the defendant competent this week.':'The file reads '+score+', a loss, and '+proj+'. We have opened an inquiry into how exactly we all agreed to watch this happen in real time.';
}
function playersParagraph(t,r){
 const rows=(t.starter_details||[]).slice(),top=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2),low=rows.slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],stars=top.map(fact).join(' | '),lowFact=low?fact(low):'No verified low starter detail was available.';
 const trend=rows.filter(p=>['hot','cold'].includes(p?.recent_form?.label)).sort((a,b)=>Math.abs(Number(b.recent_form?.delta)||0)-Math.abs(Number(a.recent_form?.delta)||0))[0],trendNote=trend?(' And because one week is how fools get tattoos, the longer sample matters: '+trend.name+' is in a '+(trend.recent_form.label==='hot'?'heater':'rut')+', '+one(trend.recent_form.last3_avg)+' per game over the last three versus '+one(trend.recent_form.prior3_avg)+' over the prior three.'):'';
 if(r.id==='walter-mercer')return 'The people who kept us sane: '+(stars||'No verified starter production was available.')+' The person currently receiving the traditional beat-writer side-eye: '+lowFact+trendNote;
 if(r.id==='tess-delaney')return 'Here is the part where the box score gets rude. The good: '+(stars||'No verified starter production was available.')+' The less-good: '+lowFact+'. Fantasy points and real NFL production are both on the record, because vibes have lost their subpoena immunity.'+trendNote;
 if(r.id==='mack-hollis')return 'PUT THESE MEN ON THE FRONT PAGE: '+(stars||'No verified starter production was available.')+' Bury this next bit near the classifieds: '+lowFact+trendNote;
 return 'Exhibit A, the useful citizens: '+(stars||'No verified starter production was available.')+' Exhibit B, currently under polite investigation: '+lowFact+'. Nobody is charged with a crime. Yet.'+trendNote;
}
function leagueContextParagraph(t,w,r){
 const c=t?.league_context;if(!c?.season_context_available)return 'Season file: Sleeper has not supplied enough completed matchup history for a verified streak or standings narrative.';
 const rec=c.record||{},record=String(rec.wins||0)+'-'+String(rec.losses||0)+(Number(rec.ties)?'-'+String(rec.ties):''),rank=Number(c.standings_rank),size=Number(c.league_size)||32,st=c.streak||{},streak=Number(st.length)>=2?(Number(st.length)+'-game '+(st.type==='W'?'winning':'losing')+' streak'):'no active multi-game streak';
 const recent=Number(c.recent_avg_points),prior=Number(c.prior_five_avg_points),stretch=Number.isFinite(recent)&&Number.isFinite(prior)&&Math.abs(recent-prior)>=8?(' Over the last five, the club is averaging '+one(recent)+', '+one(Math.abs(recent-prior))+' '+(recent>prior?'higher':'lower')+' than the prior five — '+(recent>prior?'sustained strong form.':'a genuine downturn.')):Number.isFinite(recent)&&Number(c.recent_games?.length)>=3?(' Recent scoring pace: '+one(recent)+' per game across the last '+c.recent_games.length+'.'):'';
 let playoff='';
 if(Number(c.playoff_teams)>0&&rank){
  if(Number(c.games_until_playoffs)<=6){
   playoff=' The playoff push is live: '+t.team_name+' sits #'+rank+' of '+size+', '+(c.inside_playoff_line?'inside':'outside')+' a '+c.playoff_teams+'-team field with '+c.games_until_playoffs+' regular-season game'+(Number(c.games_until_playoffs)===1?'':'s')+' before the playoff window.';
  }else playoff=' In the early table, '+t.team_name+' is #'+rank+' of '+size+' with '+c.playoff_teams+' playoff places ultimately available.';
 }
 if(r.id==='walter-mercer')return 'The season ledger now reads '+record+', with a '+streak+'.'+stretch+playoff+' Longtime readers will recognize this as the exact moment optimism usually begins making irresponsible purchases.';
 if(r.id==='tess-delaney')return 'Zoom out before we start hanging banners: '+record+', league rank #'+(rank||'—')+', '+streak+'.'+stretch+playoff+' The numbers are either building a case or preparing an elaborate prank.';
 if(r.id==='mack-hollis')return 'NOW FOR THE PART WE WILL ABSOLUTELY USE TO ANNOY OTHER MANAGERS: '+record+'. '+streak.toUpperCase()+'.'+stretch+playoff+' Yes, screenshots are encouraged.';
 return 'The season file says '+record+', standing #'+(rank||'—')+', '+streak+'.'+stretch+playoff+' This is where a fan starts believing and an investigator starts backing up the hard drive.';
}
function outlook(t,w,r){
 const div=t.division_results||[],wins=div.filter(x=>x.won).length,next=t.next_opponent_roster_id?'Next: '+t.next_opponent_name+'. ':'Sleeper has not supplied a next opponent, so none will be invented. ',division=div.length?wins+' of '+div.length+' other division teams won in Week '+w+'.':'No complete divisional comparison was available.';
 if(r.id==='walter-mercer')return next+division+' We will spend the next several days pretending this matchup is “just another week,” a lie everyone involved has agreed to respect.';
 if(r.id==='tess-delaney')return next+division+' I will now stare at the usage trends until they either become predictive or file a restraining order.';
 if(r.id==='mack-hollis')return next+division+' The presses are warm, the group chat is vulnerable, and we intend to behave with exactly the amount of dignity this league has earned.';
 return next+division+' The file remains open. So does the tab containing the standings, which is certainly healthy behavior.';
}

export function buildInquirerWeek({season,week,teams,players,weeklyStats,weeklyStatHistory={},scoringSettings,scoreFn}){
 const ids=(teams||[]).map(t=>String(t.roster_id)).sort((a,b)=>(Number(a)-Number(b))||a.localeCompare(b)),raw=weeklyStatsMap(weeklyStats),facts={},meta=players||{},needed=new Set(),historyByWeek=Object.fromEntries(Object.entries(weeklyStatHistory||{}).map(([w,payload])=>[Number(w),weeklyStatsMap(payload)]));
 for(const t of teams||[]){for(const p of t.starter_details||[])needed.add(String(p.id));for(const move of t.transactions||[]){for(const id of move.adds||[])needed.add(String(id));for(const id of move.drops||[])needed.add(String(id))}}
 for(const id of needed){
  const m=meta[id]||{},stats=raw[id]||{},position=String(m.position||m.fantasy_positions?.[0]||'FLEX'),name=String(m.full_name||((m.first_name||'')+' '+(m.last_name||'')).trim()||id),fp=typeof scoreFn==='function'?scoreFn(stats,scoringSettings):null,
   series=Object.keys(historyByWeek).map(Number).sort((a,b)=>a-b).map(w=>{const st=historyByWeek[w]?.[id];if(!st)return null;const pts=typeof scoreFn==='function'?scoreFn(st,scoringSettings):null;return Number.isFinite(Number(pts))?{week:w,points:Number(pts),real_stat_line:realStatLine(position,st)}:null}).filter(Boolean),
   last3=series.slice(-3),prior3=series.slice(-6,-3),lastAvg=last3.length?last3.reduce((n,x)=>n+x.points,0)/last3.length:null,priorAvg=prior3.length?prior3.reduce((n,x)=>n+x.points,0)/prior3.length:null,delta=Number.isFinite(lastAvg)&&Number.isFinite(priorAvg)?lastAvg-priorAvg:null,
   label=last3.length===3&&prior3.length>=2&&Number.isFinite(delta)&&delta>=3&&lastAvg>=priorAvg*1.2?'hot':last3.length===3&&prior3.length>=2&&Number.isFinite(delta)&&delta<=-3&&lastAvg<=priorAvg*.8?'cold':last3.length===3?'steady':'insufficient';
  facts[id]={id,name,position,nfl_team:String(m.team||'FA'),points:Number.isFinite(Number(fp))?Number(fp):null,real_stat_line:realStatLine(position,stats),recent_form:{games:series.length,last3_avg:lastAvg,prior3_avg:priorAvg,delta,label,series}};
 }
 const enriched=(teams||[]).map(t=>{const reporter=reporterForTeam(t.roster_id,week,ids),starters=(t.starter_details||[]).map(p=>({...p,real_stat_line:facts[String(p.id)]?.real_stat_line||'',real_stats_available:!!facts[String(p.id)]?.real_stat_line,recent_form:facts[String(p.id)]?.recent_form||null})),tt={...t,starter_details:starters},article={schema_version:2,inquirer_version:INQUIRER_VERSION,season:Number(season),week:Number(week),roster_id:String(t.roster_id),reporter:reporterPublic(reporter),headline:headline(tt,week,reporter),byline:'By '+reporter.name+', '+reporter.title,deck:reporter.desk+' • '+reporter.signature,paragraphs:[intro(tt,week,reporter),leagueContextParagraph(tt,week,reporter),playersParagraph(tt,reporter),txText(tt,facts),outlook(tt,week,reporter)],aside:aside(tt,week,reporter),generated_from:'Sleeper completed matchup, season-to-date matchup history, standings, projection, transaction, roster, player metadata, and weekly real-life stats',real_stats_source:'Sleeper weekly stats',facts:{team_points:Number(tt.points),opponent_points:Number(tt.opponent_points),projected:Number(tt.projected),league_context:tt.league_context||null,starter_details:starters}};return{...tt,inquirer_article:article,reporter_id:reporter.id}});
 return{reporters:publicReporters(),teams:enriched};
}
