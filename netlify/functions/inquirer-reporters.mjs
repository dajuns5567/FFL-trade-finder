'use strict';

export const INQUIRER_VERSION=16;
export const INQUIRER_PLAYOFF_START_WEEK=14;
export const INQUIRER_FINAL_WEEK=17;
export function inquirerWeekClassification(week,season,conference=''){
 const w=Number(week),conf=/^(AFC|NFC)$/i.test(String(conference||''))?String(conference).toUpperCase():'';
 if(w>=1&&w<=13)return{week:w,season:Number(season),phase:'Regular Season',playoffs:false,round:null,conference:conf||null,label:'Week '+w+' • Regular Season',playoff_start_week:14,final_week:17};
 const generic={14:'Wildcard Round',15:'Divisional Round',16:'Championship',17:'Super Bowl'}[w]||'Playoffs';
 const round=w===17?'Super Bowl':(conf?conf+' '+generic:'NFC/AFC '+generic);
 return{week:w,season:Number(season),phase:'Playoffs',playoffs:w>=14&&w<=17,round,conference:conf||null,label:'Week '+w+' • '+round,playoff_start_week:14,final_week:17};
}
export const INQUIRER_HOUSE_STYLE='Hometown beat reporter + fan. Frequent sarcasm, embedded humor, long-form analysis, and dramatic framing are encouraged. Dramatic without inventing facts: scores, standings, transactions, player production, streaks, projections, and real-life stats must remain grounded in Sleeper data.';

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
function recentHistoryParagraph(t,r){
 const games=(t?.league_context?.recent_games||[]).slice(-4);
 if(games.length<2)return '';
 const run=games.map(g=>(g.result||'?')+' '+one(g.points)+'–'+one(g.opponent_points)+(g.opponent_name?' vs '+g.opponent_name:'')).join(', ');
 const wins=games.filter(g=>g.result==='W').length,losses=games.filter(g=>g.result==='L').length;
 if(r.id==='walter-mercer')return 'This week did not arrive by itself. The last four entries in the notebook read: '+run+'. That is '+wins+' wins and '+losses+' losses in the stretch, which is enough of a sample to stop calling every result an accident.';
 if(r.id==='tess-delaney')return 'The recent sample matters more than whichever emotion won Sunday night. Over the last '+games.length+' completed games the sequence is '+run+'. That gives us an actual trend line instead of the fantasy-football equivalent of reading tea leaves.';
 if(r.id==='mack-hollis')return 'FOR THOSE JUST JOINING THE BANDWAGON: the recent tape says '+run+'. That is '+wins+' wins, '+losses+' losses, and at least '+games.length+' separate opportunities for this fan base to behave irrationally.';
 return 'The case file has prior pages. Recent results: '+run+'. A single week can lie. '+games.length+' completed games are at least required to coordinate their story.';
}
function gameAnatomyParagraph(t,r){
 const rows=(t.starter_details||[]).filter(p=>Number.isFinite(Number(p.points))),team=Number(t.points)||0,sorted=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points)),top3=sorted.slice(0,3).reduce((n,p)=>n+Number(p.points||0),0),share=team>0?top3/team*100:null,
  known=rows.filter(p=>Number.isFinite(Number(p.projected))),over=known.filter(p=>Number(p.points)-Number(p.projected)>=3).length,under=known.filter(p=>Number(p.projected)-Number(p.points)>=3).length,
  margin=Number(t.points)-Number(t.opponent_points),projMargin=Number(t.points)-Number(t.projected);
 const core=(Number.isFinite(share)?' The top three starters supplied '+share.toFixed(0)+'% of the team total.':'')+(known.length?' '+over+' starters beat projection by at least three points; '+under+' missed it by at least three.':'')+(Number.isFinite(projMargin)?' The final score landed '+Math.abs(projMargin).toFixed(1)+' points '+(projMargin>=0?'above':'below')+' the pregame projection.':'');
 if(r.id==='walter-mercer')return 'How it happened matters. The margin was '+Math.abs(margin).toFixed(1)+' points.'+core+' That is either a balanced win or a warning label, depending on how many names did the lifting.';
 if(r.id==='tess-delaney')return 'The anatomy of the score is more useful than the score itself.'+core+' Translation: we can tell whether this came from repeatable depth or three guys dragging everyone else through customs.';
 if(r.id==='mack-hollis')return 'LET US AUTOPSY THIS BEAUTIFUL/UGLY THING.'+core+' If three players are carrying the newspaper, fine. Just do not ask them to carry the building every week.';
 return 'The forensic accounting is straightforward.'+core+' Concentration is not automatically a crime, but it is how dependency gets introduced to the record.';
}
function supportingCastParagraph(t,r){
 const rows=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points)),support=rows.slice(2,5),low=rows[rows.length-1];
 const supportText=support.length?support.map(fact).join(' | '):'The middle of the lineup produced no additional verified detail.';
 const lowText=low?fact(low):'No verified low starter detail was available.';
 if(r.id==='walter-mercer')return 'The headline names were not alone. The middle of the card gave us '+supportText+' At the other end sat '+lowText+' A roster survives September on stars. It survives November on the people between those two sentences.';
 if(r.id==='tess-delaney')return 'Depth check: '+supportText+' The low-end result was '+lowText+' This is where sustainability usually hides: not in the best score on the page, but in whether the fifth- and sixth-best starters are useful human beings.';
 if(r.id==='mack-hollis')return 'THE SUPPORTING CAST, because even tabloids have union rules: '+supportText+' And then there was '+lowText+' We are not booing. We are merely clearing our throat very loudly.';
 return 'Secondary evidence matters. '+supportText+' The weakest verified starter return: '+lowText+' Cases are rarely decided by one witness, unless that witness scores 40 and everyone else gets to go home early.';
}
function managerParagraph(t,facts,r){
 const bench=t.best_bench,worst=t.worst_starter,benchPts=Number(bench?.points),worstPts=Number(worst?.points),swing=Number.isFinite(benchPts)&&Number.isFinite(worstPts)?benchPts-worstPts:null;
 let lineup='';
 if(Number.isFinite(swing)&&swing>=5)lineup=' There was also a bench decision worth putting under fluorescent light: '+bench.name+' scored '+one(benchPts)+' while '+worst.name+' started for '+one(worstPts)+', a '+one(swing)+'-point difference.';
 else if(Number.isFinite(swing))lineup=' The loudest bench-versus-starter gap was only '+one(Math.max(0,swing))+' points, so we can spare the manager the ceremonial public hearing.';
 const tx=txText(t,facts);
 if(r.id==='walter-mercer')return tx+lineup+' Managers do not get credit for points after kickoff, but they absolutely get blamed for leaving them in the wrong chair.';
 if(r.id==='tess-delaney')return tx+lineup+' Lineup decisions are process, not fortune-telling, but process is the part we are actually allowed to evaluate without pretending to own a crystal ball.';
 if(r.id==='mack-hollis')return tx+lineup+' If the wrong guy was on the bench, please direct all complaint mail to the front office. We have already ordered extra envelopes.';
 return tx+lineup+' The transaction log and lineup card remain the two documents management keeps hoping reporters will forget to request.';
}
function opponentContextParagraph(t,r){
 const o=t?.opponent_context,name=t.opponent_name||'the opponent';
 if(!o?.record)return 'The opponent file is thin enough that we will not manufacture a résumé for '+name+'.';
 const rec=o.record,record=(rec.wins||0)+'-'+(rec.losses||0)+(Number(rec.ties)?'-'+rec.ties:''),rank=Number(o.standings_rank),st=o.streak||{},streak=Number(st.length)>=2?st.length+'-game '+(st.type==='W'?'winning':'losing')+' streak':'no active multi-game streak';
 const quality=rank&&rank<=Math.max(8,Number(o.playoff_teams)||0)?'one of the stronger teams on the board':'a team the standings do not currently place among the elite';
 if(r.id==='walter-mercer')return 'The other sideline deserves context too. '+name+' came in '+record+', ranked #'+(rank||'—')+', with a '+streak+'. That is '+quality+'. Results mean more when you know who was standing on the other side.';
 if(r.id==='tess-delaney')return 'Opponent adjustment, because beating a contender and beating a crater are not the same data point: '+name+' entered '+record+', rank #'+(rank||'—')+', '+streak+'. In plain English, this was '+quality+'.';
 if(r.id==='mack-hollis')return 'ABOUT THE PEOPLE WE JUST BEAT/LOST TO: '+name+' entered '+record+', ranked #'+(rank||'—')+', with a '+streak+'. So yes, the résumé matters. Please include this paragraph in any rival-manager appeal.';
 return 'Cross-examination of the opponent: '+name+', '+record+', standing #'+(rank||'—')+', '+streak+'. Context does not excuse a loss or cheapen a win; it merely prevents us from prosecuting the wrong case.';
}
function nextWeekParagraph(t,w,r){
 const n=t?.next_opponent_context,name=t.next_opponent_name||'the next opponent',nextClass=Number(w)<INQUIRER_FINAL_WEEK?inquirerWeekClassification(Number(w)+1,t?.week_classification?.season||new Date().getFullYear(),t.conference):null,roundText=nextClass?.playoffs&&nextClass?.round?' in the '+nextClass.round:'';
 if(!t.next_opponent_roster_id){
  if(Number(w)>=INQUIRER_FINAL_WEEK)return 'There is no next fantasy matchup after the Super Bowl. The season ends here, which is either glorious or an excellent time to mute the league chat.';
  return 'Sleeper has not supplied the next opponent yet, so this newspaper will resist the ancient temptation to invent one'+(roundText?'. The next calendar stop is the '+nextClass.round:'')+'.';
 }
 const rec=n?.record?((n.record.wins||0)+'-'+(n.record.losses||0)+(Number(n.record.ties)?'-'+n.record.ties:'')):'record unavailable',rank=Number(n?.standings_rank),st=n?.streak||{},streak=Number(st.length)>=2?st.length+'-game '+(st.type==='W'?'winning':'losing')+' streak':'no active multi-game streak';
 if(r.id==='walter-mercer')return 'Next'+roundText+' is '+name+', currently '+rec+(rank?', #'+rank+' in the league':'')+', with a '+streak+'. That gives the next week shape. We can stop pretending the schedule is just a row of anonymous boxes.';
 if(r.id==='tess-delaney')return 'The next data point'+roundText+' is '+name+': '+rec+(rank?', league rank #'+rank:'')+', '+streak+'. If the current trend is real, this is where it gets another chance to prove it.';
 if(r.id==='mack-hollis')return 'NEXT VICTIM/PROBLEM'+(roundText?roundText.toUpperCase():'')+': '+name+', '+rec+(rank?', ranked #'+rank:'')+', '+streak+'. The back page is already working on two headlines and will deny both under oath.';
 return 'Next file'+roundText+': '+name+', '+rec+(rank?', standing #'+rank:'')+', '+streak+'. Preparation begins now, along with the usual fan ritual of checking the matchup seventeen times before Tuesday.';
}
function valueHistoryParagraph(t,r){
 const v=t?.value_history_week;
 if(!v||!Number.isFinite(Number(v.delta)))return 'Value Watch: the team-specific Value History feed does not yet have two valid observations to support a movement claim. No market swing will be invented for the sake of a paragraph.';
 const delta=Number(v.delta),pct=Number(v.pct),period=v.period==='7D'?'the last seven days':'the available post-reset tracking window',direction=delta>0?'gained':delta<0?'lost':'held exactly flat',magnitude=Math.abs(delta),pctText=Number.isFinite(pct)?' ('+(pct>0?'+':'')+pct.toFixed(1)+'%)':'';
 if(r.id==='walter-mercer')return 'Value Watch: this roster '+direction+' '+magnitude.toLocaleString()+' points of team value over '+period+pctText+', moving from '+Number(v.baseline_value||0).toLocaleString()+' to '+Number(v.value||0).toLocaleString()+'. Market value is not the standings, but it is the league’s running opinion poll, and opinion has moved.';
 if(r.id==='tess-delaney')return 'Value Watch, because apparently we needed another chart to have feelings about: team value '+(delta>=0?'rose ':'fell ')+Math.abs(delta).toLocaleString()+' over '+period+pctText+', from '+Number(v.baseline_value||0).toLocaleString()+' to '+Number(v.value||0).toLocaleString()+'. The interesting question is whether that move is being earned by sustainable usage and production or by one loud Sunday.';
 if(r.id==='mack-hollis')return 'VALUE WATCH: '+(delta>0?'THE MARKET LOVES US':'THE MARKET HAS QUESTIONS')+'. This roster '+direction+' '+magnitude.toLocaleString()+' points over '+period+pctText+' and now sits at '+Number(v.value||0).toLocaleString()+'. Please forward all favorable screenshots to the rival group chat and all unfavorable ones to our legal department.';
 return 'Value Watch has entered the evidence file: '+(delta>=0?'+':'')+delta.toLocaleString()+' over '+period+pctText+', with team value moving from '+Number(v.baseline_value||0).toLocaleString()+' to '+Number(v.value||0).toLocaleString()+'. That does not prove the roster improved or declined, but it does establish that the market changed its testimony.';
}
function availabilityParagraph(t,w,r){
 const a=t?.next_week_availability,nextWeek=Number(a?.next_nfl_week)||Number(w)+1,byes=a?.bye_players||[],byeStarters=a?.bye_current_starters||[],inj=a?.injury_players||[],injStarters=a?.injury_current_starters||[];
 if(a?.fantasy_season_complete||Number(w)>=INQUIRER_FINAL_WEEK)return 'Next Week Personnel: Week '+INQUIRER_FINAL_WEEK+' closes the Fleeced! in-season fantasy calendar. There is no Week 18 fantasy preview to manufacture, so the personnel file closes here.';
 const list=rows=>rows.slice(0,5).map(x=>x.name+' ('+x.position+(x.designation?', '+x.designation:'')+')').join(', ');
 if(!a)return 'Next-week personnel file: no verified roster-availability bundle was available, so no bye or injury problem will be manufactured.';
 if(!a.schedule_verified&&inj.length===0)return 'Next-week personnel file: the NFL schedule lookup was unavailable and Sleeper supplied no current injury designation worth publishing. This desk declines to convert missing data into fake concern.';
 let core='';
 if(a.schedule_verified)core=byes.length?(byeStarters.length+' current starter'+(byeStarters.length===1?'':'s')+' and '+byes.length+' rostered player'+(byes.length===1?'':'s')+' are on verified NFL byes in Week '+nextWeek+'. '+(byeStarters.length?'Current-starter byes: '+list(byeStarters)+'. ':'') ):'No rostered player is on a verified NFL bye in Week '+nextWeek+'. ';
 else core='The next-week NFL schedule could not be verified, so bye claims are withheld. ';
 core+=inj.length?('Sleeper currently flags '+inj.length+' rostered player'+(inj.length===1?'':'s')+' with an injury/status designation'+(injStarters.length?', including '+injStarters.length+' current starter'+(injStarters.length===1?'':'s'):'')+': '+list(inj)+'.'):'Sleeper currently shows no rostered player with a publishable injury/status designation.';
 if(r.id==='walter-mercer')return 'Next Week Personnel: '+core+' That is the part of the matchup preview where optimism meets the active roster.';
 if(r.id==='tess-delaney')return 'Next Week Personnel: '+core+' Bye weeks and injury designations are not strategy, but pretending they do not exist is definitely a strategy, just not one I recommend.';
 if(r.id==='mack-hollis')return 'NEXT WEEK ROSTER PANIC INDEX: '+core+' If the depth chart survives this cleanly, we reserve the right to become smug about roster construction.';
 return 'Next Week Personnel File: '+core+' Consider this advance notice before anyone claims Tuesday that the roster problem appeared without warning.';
}
function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)||0))}
function fanSentimentForTeam(t){
 const c=t?.league_context||{},games=(c.recent_games||[]).slice(-5),weights=[.55,.7,.85,1,1.15].slice(-games.length),career=t?.manager_career||{},v=t?.value_history_week||{},st=c.streak||{};
 let raw=0;
 for(let i=0;i<games.length;i++)raw+=(games[i]?.result==='W'?8:games[i]?.result==='L'?-8:0)*(weights[i]||1);
 if(st.type==='W')raw+=Math.min(14,Math.max(0,Number(st.length)-1)*3.5);
 if(st.type==='L')raw-=Math.min(14,Math.max(0,Number(st.length)-1)*3.5);
 const recent=Number(c.recent_avg_points),prior=Number(c.prior_five_avg_points);
 if(Number.isFinite(recent)&&Number.isFinite(prior))raw+=clamp((recent-prior)/3,-10,10);
 const rank=Number(c.standings_rank),size=Number(c.league_size)||32,playoffTeams=Number(c.playoff_teams)||0;
 if(rank){if(rank<=4)raw+=10;else if(playoffTeams&&rank<=playoffTeams)raw+=5;else if(rank>size-5)raw-=10}
 const rec=c.record||{},gp=Number(rec.wins||0)+Number(rec.losses||0)+Number(rec.ties||0);
 if(gp)raw+=clamp(((Number(rec.wins||0)+.5*Number(rec.ties||0))/gp-.5)*24,-10,10);
 const pct=Number(v.pct);if(Number.isFinite(pct))raw+=clamp(pct*2,-10,10);
 const projDelta=Number(t.points)-Number(t.projected);if(Number.isFinite(projDelta))raw+=clamp(projDelta/5,-5,5);
 const lineupSwing=Number(t?.best_bench?.points)-Number(t?.worst_starter?.points);if(Number.isFinite(lineupSwing)&&lineupSwing>7)raw-=clamp((lineupSwing-7)/2,0,8);
 const recentTrades=Number(t.recent_trade_count)||0;
 if(recentTrades&&Number.isFinite(pct))raw+=pct>0?3:pct<0?-3:0;
 const priorChamps=Number(career.championships)||0,currentTitle=t.current_season_champion?1:0,totalChamps=priorChamps+currentTitle;
 raw+=priorChamps>=3?42:priorChamps===2?32:priorChamps===1?16:0;
 if(currentTitle)raw+=20;
 raw+=Math.min(10,(Number(career.playoff_wins)||0)*1.5)+Math.min(6,(Number(career.regular_season_titles)||0)*3);
 raw=clamp(raw,-100,100);
 const previous=t?.previous_fan_sentiment,continuity=previous&&String(previous.manager_user_id||'')===String(t.manager_user_id||'')&&Number.isFinite(Number(previous.score));
 const score=Math.round(clamp(continuity?Number(previous.score)*.65+raw*.35:raw,-100,100)),change=continuity?score-Number(previous.score):null;
 let tier,title,scene;
 if(score>=82&&totalChamps>=2){tier='IMMORTAL';title='Hall of Fame Petition';scene='Fans are circulating paperwork to put the owner in the league Hall of Fame before somebody can invent a waiting period. Multiple championships have converted normal gratitude into civic mythology.'}
 else if(score>=70){tier='BELOVED';title='Build the Statue';scene='The fan base has moved from applause to urban planning. There are unserious proposals for a statue, a street rename, and at least one parade route that definitely has not been approved.'}
 else if(score>=55){tier='ECSTATIC';title='Parade Permit Pending';scene='Fans are openly planning celebrations and treating every competent roster move as evidence that management sees football in four dimensions.'}
 else if(score>=40){tier='THRILLED';title='Standing Ovation';scene='The building is loud, the approval rating is louder, and even the habitual complainers are having difficulty finding a grievance that can survive daylight.'}
 else if(score>=25){tier='PLEASED';title='Strong Approval';scene='Fans are happy with management and mostly willing to let the front office cook, which in this league qualifies as an extraordinary period of social stability.'}
 else if(score>=10){tier='OPTIMISTIC';title='Cautious Belief';scene='The fan base likes the direction but still keeps one hand near the panic button. Hope has returned; trust is still being issued in small denominations.'}
 else if(score>-10){tier='MIXED';title='Jury Still Out';scene='The crowd is split between “the plan is working” and “we have seen this movie before.” Nobody is building a statue, but nobody has priced moving vans either.'}
 else if(score>-25){tier='RESTLESS';title='Sports-Radio Grumbling';scene='Call-in shows are getting testy. Fans are questioning decisions, but this is still complaint-line territory rather than a full municipal crisis.'}
 else if(score>-40){tier='ANGRY';title='The Boo Birds Have Arrived';scene='The boos are organized enough to have rhythm. Management is getting blamed for lineup choices, roster construction, and several weather events outside its jurisdiction.'}
 else if(score>-55){tier='FURIOUS';title='Fire-the-GM Chants';scene='The fan base has reached synchronized “fire the GM” territory. Every old trade is being reposted with a red circle around it and absolutely no generosity about context.'}
 else if(score>-70){tier='MUTINOUS';title='Ban Him From the City';scene='Fans are joking about revoking management’s city privileges. Local message boards have produced mock eviction notices, fake border checkpoints, and the sort of civic paperwork only a losing streak can inspire.'}
 else if(score>-85){tier='REVOLT';title='Metaphorical Torches & Pitchforks';scene='The mood has entered cartoon-revolt territory: metaphorical torches, pitchforks, and demands that the GM be escorted to the city limits by a marching band playing only sad trombone.'}
 else{tier='APOCALYPTIC';title='The Imaginary Mansion Is Under Siege';scene='In the grand tradition of sports-fan hyperbole, the bit has escalated to an imaginary mob “storming the GM’s mansion” with foam pitchforks, novelty torches, and a petition banning the front office from every brunch spot in town.'}
 return{score,raw_score:Math.round(raw),change,continuity:!!continuity,tier,title,scene,manager_user_id:String(t.manager_user_id||''),championships:totalChamps,prior_championships:priorChamps,current_season_champion:!!t.current_season_champion,recent_trade_count:recentTrades,value_change:Number.isFinite(Number(v.delta))?Number(v.delta):null,recent_record:games.reduce((a,g)=>{if(g.result==='W')a.w++;else if(g.result==='L')a.l++;else a.t++;return a},{w:0,l:0,t:0})};
}
function fanSentimentParagraph(t,r,sentiment){
 const s=sentiment||fanSentimentForTeam(t),delta=s.change==null?'':(' That is '+Math.abs(s.change)+' sentiment point'+(Math.abs(s.change)===1?'':'s')+' '+(s.change>=0?'warmer':'colder')+' than last week, so the crowd is moving without pretending one Sunday erased the month before it.');
 const evidence=' The mood is carrying '+s.recent_record.w+'-'+s.recent_record.l+(s.recent_record.t?'-'+s.recent_record.t:'')+' over the recent sample, '+s.championships+' championship'+(s.championships===1?'':'s')+' on the current manager résumé, '+s.recent_trade_count+' recent trade'+(s.recent_trade_count===1?'':'s')+(s.value_change==null?'':', and a '+(s.value_change>=0?'+':'')+s.value_change.toLocaleString()+' team-value move')+'.';
 if(r.id==='walter-mercer')return 'Fan Sentiment — '+s.title+': '+s.scene+evidence+delta+' The useful part is that this crowd remembers more than seven days, even when talk radio does not.';
 if(r.id==='tess-delaney')return 'Fan Sentiment Index — '+s.title+': '+s.scene+evidence+delta+' Reputation has inertia; a good manager is not suddenly incompetent because variance learned his address.';
 if(r.id==='mack-hollis')return 'FAN SENTIMENT — '+s.title.toUpperCase()+': '+s.scene+evidence+delta+' This newspaper supports calm, reasoned discourse and has therefore printed the loudest possible version of it.';
 return 'Public Sentiment File — '+s.title+': '+s.scene+evidence+delta+' The prosecution notes that reputations are cumulative evidence, not a single-week mugshot.';
}
function closingParagraph(t,r){
 const won=!!t.won;
 if(r.id==='walter-mercer')return won?'So keep the clipping. This one earned ink. But a season is not built by admiring yesterday’s paper; it is built by giving us something worth printing again next week.':'File the loss, remember why it happened, and move on. Fans are allowed to be irritated. Beat writers are required to save the receipts.';
 if(r.id==='tess-delaney')return won?'The fun part is that the result and the process mostly agree. The terrifying part is that I have now typed that sentence where the fantasy gods can see it.':'The loss is useful only if the process changes. Otherwise we are not analyzing a trend; we are documenting a hobby with poor boundaries.';
 if(r.id==='mack-hollis')return won?'Enjoy it. Screenshot the standings. Send something tasteful and deeply annoying to the rival chat. Tomorrow we resume pretending to be professionals.':'Be angry tonight. Be funny about it tomorrow. And if this roster does it again next week, we are printing names in a font usually reserved for indictments.';
 return won?'The evidence supports optimism, which is deeply inconvenient for a desk built on suspicion. We will adapt.':'The evidence is not fatal. It is merely annoying, specific, and now archived. That is what newspapers are for.';
}
function leagueContextParagraph(t,w,r){
 const c=t?.league_context;if(!c?.season_context_available)return 'Season file: Sleeper has not supplied enough completed matchup history for a verified streak or standings narrative.';
 const rec=c.record||{},record=String(rec.wins||0)+'-'+String(rec.losses||0)+(Number(rec.ties)?'-'+String(rec.ties):''),rank=Number(c.standings_rank),size=Number(c.league_size)||32,st=c.streak||{},streak=Number(st.length)>=2?(Number(st.length)+'-game '+(st.type==='W'?'winning':'losing')+' streak'):'no active multi-game streak';
 const recent=Number(c.recent_avg_points),prior=Number(c.prior_five_avg_points),stretch=Number.isFinite(recent)&&Number.isFinite(prior)&&Math.abs(recent-prior)>=8?(' Over the last five, the club is averaging '+one(recent)+', '+one(Math.abs(recent-prior))+' '+(recent>prior?'higher':'lower')+' than the prior five — '+(recent>prior?'sustained strong form.':'a genuine downturn.')):Number.isFinite(recent)&&Number(c.recent_games?.length)>=3?(' Recent scoring pace: '+one(recent)+' per game across the last '+c.recent_games.length+'.'):'';
 let playoff='';
 if(Number(c.playoff_teams)>0&&rank){
  if(Number(w)>=INQUIRER_PLAYOFF_START_WEEK&&Number(w)<=INQUIRER_FINAL_WEEK){
   playoff=' The '+String(t?.week_classification?.round||'playoffs')+' is underway — this newsroom marks Week '+INQUIRER_PLAYOFF_START_WEEK+' as the start — so every lineup choice now carries elimination/seeding consequences. '+t.team_name+' enters this '+String(t?.week_classification?.round||'playoff round')+' file at #'+rank+' of '+size+'.';
  }else if(Number(c.games_until_playoffs)<=6){
   playoff=' The playoff push is live: '+t.team_name+' sits #'+rank+' of '+size+', '+(c.inside_playoff_line?'inside':'outside')+' a '+c.playoff_teams+'-team field with '+c.games_until_playoffs+' regular-season game'+(Number(c.games_until_playoffs)===1?'':'s')+' before Week '+INQUIRER_PLAYOFF_START_WEEK+' opens the playoffs.';
  }else playoff=' In the early table, '+t.team_name+' is #'+rank+' of '+size+' with '+c.playoff_teams+' playoff places ultimately available. Week '+INQUIRER_PLAYOFF_START_WEEK+' is the postseason line this desk is tracking.';
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

export function buildInquirerWeek({season,week,teams,players,weeklyStats,weeklyStatHistory={},scoringSettings,scoreFn,weekClassification=null}){
 const ids=(teams||[]).map(t=>String(t.roster_id)).sort((a,b)=>(Number(a)-Number(b))||a.localeCompare(b)),raw=weeklyStatsMap(weeklyStats),facts={},meta=players||{},needed=new Set(),historyByWeek=Object.fromEntries(Object.entries(weeklyStatHistory||{}).map(([w,payload])=>[Number(w),weeklyStatsMap(payload)]));
 for(const t of teams||[]){for(const p of t.starter_details||[])needed.add(String(p.id));for(const move of t.transactions||[]){for(const id of move.adds||[])needed.add(String(id));for(const id of move.drops||[])needed.add(String(id))}}
 for(const id of needed){
  const m=meta[id]||{},stats=raw[id]||{},position=String(m.position||m.fantasy_positions?.[0]||'FLEX'),name=String(m.full_name||((m.first_name||'')+' '+(m.last_name||'')).trim()||id),fp=typeof scoreFn==='function'?scoreFn(stats,scoringSettings):null,
   series=Object.keys(historyByWeek).map(Number).sort((a,b)=>a-b).map(w=>{const st=historyByWeek[w]?.[id];if(!st)return null;const pts=typeof scoreFn==='function'?scoreFn(st,scoringSettings):null;return Number.isFinite(Number(pts))?{week:w,points:Number(pts),real_stat_line:realStatLine(position,st)}:null}).filter(Boolean),
   last3=series.slice(-3),prior3=series.slice(-6,-3),lastAvg=last3.length?last3.reduce((n,x)=>n+x.points,0)/last3.length:null,priorAvg=prior3.length?prior3.reduce((n,x)=>n+x.points,0)/prior3.length:null,delta=Number.isFinite(lastAvg)&&Number.isFinite(priorAvg)?lastAvg-priorAvg:null,
   label=last3.length===3&&prior3.length>=2&&Number.isFinite(delta)&&delta>=3&&lastAvg>=priorAvg*1.2?'hot':last3.length===3&&prior3.length>=2&&Number.isFinite(delta)&&delta<=-3&&lastAvg<=priorAvg*.8?'cold':last3.length===3?'steady':'insufficient';
  facts[id]={id,name,position,nfl_team:String(m.team||'FA'),points:Number.isFinite(Number(fp))?Number(fp):null,real_stat_line:realStatLine(position,stats),recent_form:{games:series.length,last3_avg:lastAvg,prior3_avg:priorAvg,delta,label,series}};
 }
 const classification=weekClassification||inquirerWeekClassification(week,season);
 const enriched=(teams||[]).map(t=>{const reporter=reporterForTeam(t.roster_id,week,ids),teamClassification=inquirerWeekClassification(week,season,t.conference),starters=(t.starter_details||[]).map(p=>({...p,real_stat_line:facts[String(p.id)]?.real_stat_line||'',real_stats_available:!!facts[String(p.id)]?.real_stat_line,recent_form:facts[String(p.id)]?.recent_form||null})),benchFact=t.best_bench?{...t.best_bench,real_stat_line:facts[String(t.best_bench.id)]?.real_stat_line||'',recent_form:facts[String(t.best_bench.id)]?.recent_form||null}:null,worstFact=t.worst_starter?{...t.worst_starter,real_stat_line:facts[String(t.worst_starter.id)]?.real_stat_line||'',recent_form:facts[String(t.worst_starter.id)]?.recent_form||null}:null,tt={...t,week_classification:teamClassification,starter_details:starters,best_bench:benchFact||t.best_bench,worst_starter:worstFact||t.worst_starter},sentiment=fanSentimentForTeam(tt),paragraphs=[intro(tt,week,reporter),leagueContextParagraph(tt,week,reporter),recentHistoryParagraph(tt,reporter),gameAnatomyParagraph(tt,reporter),playersParagraph(tt,reporter),supportingCastParagraph(tt,reporter),managerParagraph(tt,facts,reporter),opponentContextParagraph(tt,reporter),valueHistoryParagraph(tt,reporter),fanSentimentParagraph(tt,reporter,sentiment),availabilityParagraph(tt,week,reporter),nextWeekParagraph(tt,week,reporter),closingParagraph(tt,reporter)].filter(Boolean),article={schema_version:5,inquirer_version:INQUIRER_VERSION,season:Number(season),week:Number(week),week_classification:teamClassification,fan_sentiment:sentiment,roster_id:String(t.roster_id),reporter:reporterPublic(reporter),headline:headline(tt,week,reporter),byline:'By '+reporter.name+', '+reporter.title,deck:reporter.desk+' • '+reporter.signature+' • '+teamClassification.label,paragraphs,aside:aside(tt,week,reporter),generated_from:'Sleeper completed matchup, season-to-date matchup history, opponent context, standings, projections, lineup decisions, transactions, roster/player metadata, weekly real-life stats, canonical team Value History, verified NFL schedule, and Sleeper injury designations',real_stats_source:'Sleeper weekly stats',facts:{team_points:Number(tt.points),opponent_points:Number(tt.opponent_points),projected:Number(tt.projected),league_context:tt.league_context||null,opponent_context:tt.opponent_context||null,next_opponent_context:tt.next_opponent_context||null,value_history_week:tt.value_history_week||null,next_week_availability:tt.next_week_availability||null,fan_sentiment:sentiment,manager_career:tt.manager_career||null,conference:tt.conference||null,division_name:tt.division_name||null,starter_details:starters,best_bench:benchFact||null,worst_starter:worstFact||null}};return{...tt,inquirer_article:article,reporter_id:reporter.id}});
 return{reporters:publicReporters(),teams:enriched};
}


const recordText=c=>{const r=c?.record||{};return String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):'')};
const standingsSort=(a,b)=>Number(a?.league_context?.standings_rank||999)-Number(b?.league_context?.standings_rank||999);
const overviewPlayerName=(players,id)=>String(players?.[String(id)]?.full_name||((players?.[String(id)]?.first_name||'')+' '+(players?.[String(id)]?.last_name||'')).trim()||id);
function tradeAssets(side,players){
 const names=(side?.player_ids||[]).map(id=>overviewPlayerName(players,id));
 for(const p of side?.picks||[])names.push(String(p?.season||'Future')+' R'+String(p?.round||'?')+' pick');
 return names.length?names.join(', '):'no listed assets';
}
function transactionOverview(transactions,players,teamById){
 const rows=(transactions||[]).filter(x=>x?.status==='complete'||x?.status==='pending'||x?.type==='waiver'||x?.type==='free_agent'||x?.type==='trade'),adds=[],drops=[];
 for(const tx of rows){for(const [id,rid] of Object.entries(tx?.adds||{}))adds.push({player:overviewPlayerName(players,id),team:teamById.get(String(rid))?.team_name||('Roster '+rid)});for(const [id,rid] of Object.entries(tx?.drops||{}))drops.push({player:overviewPlayerName(players,id),team:teamById.get(String(rid))?.team_name||('Roster '+rid)})}
 return{count:rows.length,adds,drops};
}
function hotTakeRows(teams,reporters){
 const rows=(teams||[]),takes=[];
 const streakTeam=rows.slice().sort((a,b)=>Number(b?.league_context?.streak?.length||0)-Number(a?.league_context?.streak?.length||0))[0]||rows[0];
 takes.push({reporter:reporterPublic(reporters[0]),title:'Nick Swindell: This is becoming a season, not a week',take:streakTeam?(streakTeam.team_name+' is sitting on a '+Number(streakTeam?.league_context?.streak?.length||0)+'-game '+(streakTeam?.league_context?.streak?.type==='W'?'winning':streakTeam?.league_context?.streak?.type==='L'?'losing':'mixed')+' run. If the scoring pace and lineup process keep matching the results, the rest of the league has to stop treating this as temporary noise.'):'There is not enough verified team context for a responsible streak take this week, which is less fun but considerably cheaper than inventing one.'});

 const trendPlayers=rows.flatMap(t=>(t.starter_details||[]).map(p=>({team:t,player:p}))).filter(x=>['hot','cold'].includes(x?.player?.recent_form?.label)).sort((a,b)=>Math.abs(Number(b.player.recent_form?.delta)||0)-Math.abs(Number(a.player.recent_form?.delta)||0));
 if(trendPlayers[0]){
  const x=trendPlayers[0],f=x.player.recent_form;
  takes.push({reporter:reporterPublic(reporters[1]),title:'Bartholomew Roycington III: The player trend I would actually bet attention on',take:x.player.name+' has moved from '+one(f.prior3_avg)+' fantasy points per game over the prior three to '+one(f.last3_avg)+' over the last three for '+x.team.team_name+'. If that usage/production level holds, it changes what this roster can reasonably expect from that lineup slot instead of merely giving us one fun box score.'});
 }else{
  const x=rows.flatMap(t=>(t.starter_details||[]).map(p=>({team:t,player:p}))).sort((a,b)=>Number(b.player?.points||0)-Number(a.player?.points||0))[0];
  takes.push({reporter:reporterPublic(reporters[1]),title:'Bartholomew Roycington III: One box score is not a trend, please behave accordingly',take:x?(x.player.name+' just produced '+one(x.player.points)+' fantasy points for '+x.team.team_name+'. That matters this week. It does not yet prove a new baseline, and I would like the league to survive at least three games before assigning this performance a permanent personality.'):'The multi-game player sample is too thin for a verified trend take, so the spreadsheet is exercising the restraint that managers generally refuse to show on waivers.'});
 }

 const managerMiss=rows.map(t=>({t,swing:Number(t?.best_bench?.points)-Number(t?.worst_starter?.points)})).filter(x=>Number.isFinite(x.swing)).sort((a,b)=>b.swing-a.swing)[0];
 if(managerMiss){
  takes.push({reporter:reporterPublic(reporters[2]),title:'Tilly Fleecer: Manager malpractice watch, presented with love',take:managerMiss.t.team_name+' had a '+one(Math.max(0,managerMiss.swing))+'-point gap between its best bench scorer and weakest starter. That does not make the decision wrong by hindsight alone, but if the same player-selection pattern repeats, I will personally upgrade this from “unfortunate” to “a bit.”'});
 }else{
  const active=rows.slice().sort((a,b)=>(b.transactions?.length||0)-(a.transactions?.length||0))[0];
  takes.push({reporter:reporterPublic(reporters[2]),title:'Tilly Fleecer: The absence of a bench scandal will not stop the newspaper',take:active&&active.transactions?.length?(active.team_name+' led the visible roster tinkering with '+active.transactions.length+' move'+(active.transactions.length===1?'':'s')+'. If those selections solve an actual weakness instead of merely feeding waiver-wire boredom, management deserves credit; if not, I have already reserved the headline font.'):'No verified lineup gap or transaction spree is large enough to prosecute this week. Enjoy the rare managerial amnesty. It expires at kickoff.'});
 }

 const worst=rows.slice().sort((a,b)=>Number(b?.league_context?.standings_rank||0)-Number(a?.league_context?.standings_rank||0))[0],pressure=rows.slice().sort((a,b)=>(b?.next_week_availability?.bye_current_starters?.length||0)+(b?.next_week_availability?.injury_current_starters?.length||0)-(a?.next_week_availability?.bye_current_starters?.length||0)-(a?.next_week_availability?.injury_current_starters?.length||0))[0];
 takes.push({reporter:reporterPublic(reporters[3]),title:'Jefferson Filch: The bottom of the table has consequences',take:worst?(worst.team_name+' currently sits #'+worst.league_context.standings_rank+' with a '+recordText(worst.league_context)+' record. If the losses continue, this is not only a bad season; it becomes a draft-position story. '+(pressure&&pressure.roster_id===worst.roster_id?'The next-week bye/injury pressure does not improve the defense.':'And yes, this desk is already documenting who has the schedule and roster depth to escape the basement.')):'The standings file is too incomplete for a responsible No. 1-pick take, which is exactly the kind of sentence an investigative desk should be willing to print.'});
 return takes;
}
export function buildLeagueOverview({season,week,teams,players,transactions,canonicalTrades=[],weekClassification=null,valueHistoryMeta={}}){
 const reporters=REPORTERS,classification=weekClassification||inquirerWeekClassification(week,season),rows=(teams||[]).slice(),teamById=new Map(rows.map(t=>[String(t.roster_id),t])),ranked=rows.slice().sort(standingsSort),playoffTeams=Number(ranked[0]?.league_context?.playoff_teams)||0;
 const topScore=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],biggestMargin=rows.slice().sort((a,b)=>(Number(b.points)-Number(b.opponent_points))-(Number(a.points)-Number(a.opponent_points)))[0],tx=transactionOverview(transactions,players,teamById);
 const bottomFive=ranked.slice(-5).sort((a,b)=>Number(b?.league_context?.standings_rank||0)-Number(a?.league_context?.standings_rank||0)),bubble=ranked.filter(t=>{const r=Number(t?.league_context?.standings_rank);return playoffTeams&&r>=Math.max(1,playoffTeams-2)&&r<=playoffTeams+3});
 const movers=rows.filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))).sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta)),availability=rows.filter(t=>(t?.next_week_availability?.bye_current_starters?.length||0)+(t?.next_week_availability?.injury_current_starters?.length||0)>0).sort((a,b)=>(b.next_week_availability.bye_current_starters.length+b.next_week_availability.injury_current_starters.length)-(a.next_week_availability.bye_current_starters.length+a.next_week_availability.injury_current_starters.length));
 const tradeLines=(canonicalTrades||[]).slice(0,5).map(tr=>{const sides=tr.sides||[];return sides.map(s=>(teamById.get(String(s.roster_id))?.team_name||tr.team_names?.[String(s.roster_id)]||('Roster '+s.roster_id))+' received '+tradeAssets(s,players)).join(' ↔ ')});
 const bottomText=bottomFive.map(t=>t.team_name+' (#'+t.league_context.standings_rank+', '+recordText(t.league_context)+', recent scoring '+(Number.isFinite(Number(t.league_context.recent_avg_points))?one(t.league_context.recent_avg_points):'n/a')+')').join('; ');
 const sections=[
  {reporter:reporterPublic(reporters[0]),heading:'The Week That Was',paragraphs:[(topScore?topScore.team_name+' led the league with '+one(topScore.points)+' points. ':'')+(biggestMargin?biggestMargin.team_name+' posted the loudest margin at '+one(Number(biggestMargin.points)-Number(biggestMargin.opponent_points))+' points. ':'')+'That is the top-line result sheet for '+classification.label+'. The standings will remember the wins; the beat desks will remember how they happened.',ranked.length?'The table now begins with '+ranked.slice(0,5).map(t=>'#'+t.league_context.standings_rank+' '+t.team_name+' '+recordText(t.league_context)).join(', ')+'. The league is no longer a collection of isolated Sundays. Every result is now pushing somebody toward a seed, a bubble, or a very uncomfortable offseason.':'Standings context is not available.']},
  {reporter:reporterPublic(reporters[1]),heading:'Standings, Playoff Math & The Race to the Bottom',paragraphs:[playoffTeams?(classification.playoffs?'The '+classification.round+' is here. Week 14 is the Wildcard Round, Week 15 the Divisional Round, Week 16 the NFC/AFC Championship, and Week 17 the Super Bowl. Current playoff field: '+ranked.slice(0,playoffTeams).map(t=>'#'+t.league_context.standings_rank+' '+t.team_name).join(', ')+'.':'The playoff field currently cuts at #'+playoffTeams+'. Bubble watch: '+(bubble.map(t=>'#'+t.league_context.standings_rank+' '+t.team_name+' '+recordText(t.league_context)).join(', ')||'no verified bubble rows')+'. Week 14 is the opening of the playoffs, which is close enough that pretending seeds do not matter has become performance art.'):'The league settings did not provide a verified playoff field size.',bottomFive.length?'Now the less glamorous race: the bottom five are '+bottomText+'. This is a standings-based race toward potentially finishing last and improving the path toward the No. 1 rookie pick. It is not a claim about an unverified lottery or tiebreaker. The important part is trajectory: bad recent scoring plus a losing streak is how “rough month” turns into “draft-position strategy.”':'Bottom-five standings data is unavailable.',movers.length?'Market check: the biggest team-value risers over '+(valueHistoryMeta.period==='7D'?'the last seven days':'available Value History')+' are '+movers.slice(0,3).map(t=>t.team_name+' '+(Number(t.value_history_week.delta)>=0?'+':'')+Number(t.value_history_week.delta).toLocaleString()).join(', ')+'. The biggest slides are '+movers.slice(-3).reverse().map(t=>t.team_name+' '+Number(t.value_history_week.delta).toLocaleString()).join(', ')+'. Team value is not a standings tiebreaker, but it does tell us which rosters the market thinks are changing underneath the results.':'There is not enough valid team Value History to publish a league-wide movement table yet.']},
  {reporter:reporterPublic(reporters[2]),heading:'Trade Desk & Transaction Wire',paragraphs:[tradeLines.length?'Completed trades this week: '+tradeLines.join(' | ')+'. These are reactions to the actual Sleeper transactions, not imaginary trade-machine gossip. A deal can look loud on paper and still need weeks of usage, health, and lineup context before we decide who should be mocked.':'No completed canonical Trade History deal is tagged to this week, so Tilly has been denied her preferred source of public disorder.',tx.count+' league transactions were logged in the weekly feed. '+(tx.adds.length?'Notable adds include '+tx.adds.slice(0,6).map(x=>x.player+' to '+x.team).join(', ')+'. ':'')+(tx.drops.length?'Notable drops include '+tx.drops.slice(0,4).map(x=>x.player+' from '+x.team).join(', ')+'.':'')+' Waiver activity is where confident preseason plans quietly go to be edited.']},
  {reporter:reporterPublic(reporters[3]),heading:'Next Week Pressure Report',paragraphs:[availability.length?'The rosters carrying the most immediate bye/injury pressure into the next NFL week are '+availability.slice(0,6).map(t=>t.team_name+' ('+(t.next_week_availability.bye_current_starters.length)+' current-starter byes, '+(t.next_week_availability.injury_current_starters.length)+' current-starter injury designations)').join(', ')+'. That does not predict next week’s score. It does tell us which managers have homework before kickoff.':'No team currently has a verified current-starter bye or publishable Sleeper injury designation in the next-week availability bundle.',classification.playoffs?'Because this is '+classification.label+', there is no longer such a thing as a harmless depth problem. A missing starter in Week '+week+' is a playoff roster-construction story immediately.':'With the playoffs beginning in Week 14, every coming bye cluster and injury designation is now part of the seeding race, not an administrative footnote.']}
 ];
 const hot_takes=hotTakeRows(rows,reporters);
 return{schema_version:1,inquirer_version:INQUIRER_VERSION,season:Number(season),week:Number(week),week_classification:classification,headline:'Fleeced! League Overview — '+classification.label,byline:'By '+reporters.map(r=>r.name).join(', '),deck:'Four desks. One league. Far too many opinions.',sections,hot_takes,bottom_five:bottomFive.map(t=>({roster_id:t.roster_id,team_name:t.team_name,rank:t.league_context?.standings_rank||null,record:t.league_context?.record||null,recent_avg_points:t.league_context?.recent_avg_points||null,streak:t.league_context?.streak||null})),value_history_meta:valueHistoryMeta,generated_from:'Sleeper matchups, standings, transactions, player metadata/stats, canonical Trade History, canonical team Value History, verified NFL schedule, and Sleeper injury designations'};
}
