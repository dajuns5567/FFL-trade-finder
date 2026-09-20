import {humanSectionsV21} from './inquirer-human-v21.mjs';

const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const one=x=>Number(x).toFixed(1);
const names=rows=>rows.map(p=>p.name).join(', ');
const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const MIDA_SOURCE='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/mida-live-data/data/mida-team-context.csv';

export function parseMida(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(const ch of text+'\n'){if(ch==='"')quoted=!quoted;else if(ch===','&&!quoted){row.push(cell.trim());cell=''}else if(ch==='\n'&&!quoted){row.push(cell.trim());rows.push(row);row=[];cell=''}else cell+=ch}
  const index=rows.findIndex(r=>r[0]==='Team'&&r.includes('Playoff %')&&r.includes('Title %'));
  if(index<0)return [];
  const headers=rows[index],date=text.match(/Data as of\s+([^\r\n]+)/)?.[1]||null;
  const percent=(r,key)=>{const v=r[headers.indexOf(key)];return valid(v)&&Number(v)>=0&&Number(v)<=100?Number(v):null};
  return rows.slice(index+1).filter(r=>r.length>=8&&valid(r[1])).map(r=>({name:r[0],source:MIDA_SOURCE,source_date:date,playoff:percent(r,'Playoff %'),title:percent(r,'Title %'),division:percent(r,'Division %'),expected_wins:valid(r[5])?Number(r[5]):null}));
}
export async function loadMida(){try{const r=await fetch(MIDA_SOURCE,{signal:AbortSignal.timeout(10000)});return r.ok?parseMida(await r.text()):[]}catch{return []}}
export function attachMida(teams,rows){return teams.map(t=>({...t,mida_outlook:rows.find(r=>norm(r.name)===norm(t.team_name))||null}))}

function history(p,week){
  const prior=(p?.recent_form?.series||[]).filter(r=>Number(r.week)<Number(week)&&valid(r.points));
  if(!prior.length)return null;
  const avg=prior.reduce((n,r)=>n+Number(r.points),0)/prior.length,delta=Number(p.points)-avg;
  let text=p.name+' scored '+one(Math.abs(delta))+' points '+(delta>=0?'above':'below')+' the '+one(avg)+' average from '+prior.length+' previous recorded game'+(prior.length===1?'':'s')+'. ';
  if(prior.length>=4){const last=prior.slice(-3),earlier=prior.slice(0,-3),a=last.reduce((n,r)=>n+Number(r.points),0)/last.length,b=earlier.reduce((n,r)=>n+Number(r.points),0)/earlier.length;text+='The preceding three-game average was '+one(a)+' versus '+one(b)+' earlier in the recorded window; '+(a>b?'production was already improving':a<b?'production was already cooling':'the baseline was stable')+' before this matchup.'}
  else text+='This '+(delta>=0?'raises':'lowers')+' the recent scoring baseline, but the short sample does not establish a lasting trend.';
  return text;
}
export function humanSectionsV22(args){
  const {team:t,week,facts={}}=args,rows=(t.starter_details||[]).filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points);
  return humanSectionsV21(args).map(s=>{
    let paragraphs=[...s.paragraphs];
    if(s.kind==='lede'){
      const top=rows.slice(0,3),sum=top.reduce((n,p)=>n+Number(p.points),0);
      paragraphs[2]=top.length&&Number(t.points)>0?names(top)+' supplied '+one(sum)+' points, '+Math.round(sum/Number(t.points)*100)+'% of '+t.team_name+'’s total. '+(sum/Number(t.points)>.6?'That concentration leaves little cover when one of those players has a quiet week.':'The rest of the lineup supplied a meaningful share; this result was not solely a one-player rescue.'):'n/a';
    }
    if(s.kind==='players'){
      const support=rows.slice(2,5);
      paragraphs[2]=support.length?names(support)+' combined for '+one(support.reduce((n,p)=>n+Number(p.points),0))+' points. Their supporting production '+(t.won?'helped turn the leading performances into a win.':'was not enough to close the matchup deficit.'):'n/a';
    }
    if(s.kind==='value'&&!valid(t.value_history_week?.delta))paragraphs=['n/a'];
    if(s.kind==='management'){
      const tx=(t.transactions||[]).filter(move=>!move.status||move.status==='complete');
      paragraphs=tx.length?tx.map(move=>{
        const added=(move.adds||[]).map(id=>facts[String(id)]||{name:String(id)}),dropped=(move.drops||[]).map(id=>facts[String(id)]||{name:String(id)});
        const label='Transaction verdict: '+(added.length?'added '+names(added):'no additions')+'; '+(dropped.length?'released '+names(dropped):'no releases')+'. ';
        const assets=[...added,...dropped],priced=assets.length&&assets.every(p=>valid(p.value)),scored=assets.length&&assets.every(p=>valid(p.points));
        let text=label;
        if(priced){const a=added.reduce((n,p)=>n+Number(p.value),0),d=dropped.reduce((n,p)=>n+Number(p.value),0);text+='Current snapshot value received: '+one(a)+'; surrendered: '+one(d)+'; net '+(a-d>=0?'+':'')+one(a-d)+'. '+(a>d?'The exchange improves the roster’s value balance.':a<d?'The exchange sacrifices value and needs a short-term lineup payoff to justify it.':'The exchange is value-neutral; lineup fit must supply the benefit.');}
        else text+='Overall value exchanged: n/a.';
        if(scored){const a=added.reduce((n,p)=>n+Number(p.points),0),d=dropped.reduce((n,p)=>n+Number(p.points),0);text+=' In this completed week, the additions scored '+one(a)+' and the departures '+one(d)+'. '+(!added.length?'The cut opens a roster spot but gives up that depth; its payoff depends on the replacement.':a>d?'The production comparison favors the incoming side.':a<d?'The outgoing side produced more; the move needs a longer-term payoff.':'The production comparison offers no scoring edge.')+' These are player totals, not points automatically gained in the starting lineup.';}
        return text;
      }):['n/a'];
    }
    if(s.kind==='hot-seat'||s.kind==='cool-throne'){
      const projected=rows.filter(p=>valid(p.projected)),pool=projected.length?projected:rows;
      const ordered=pool.slice().sort((a,b)=>(Number(a.points)-(projected.length?Number(a.projected):0))-(Number(b.points)-(projected.length?Number(b.projected):0)));
      const p=s.kind==='hot-seat'?ordered[0]:ordered.at(-1);
      if(!p||(projected.length&&(s.kind==='hot-seat'?Number(p.points)>=Number(p.projected):Number(p.points)<=Number(p.projected))))paragraphs=['n/a'];
      else {paragraphs=[paragraphs[0]];const trend=history(p,week);if(trend)paragraphs.push(trend);const original=s.paragraphs[1];if(/joins the Hot Seat because|receives managerial credit|gets the managerial armrest|earns.*(?:chair|throne|armrest)|receives management credit|may sit beside|may accept management credit|joins the positive finding|joins the celebration|may take a seat|enters the Cool Throne file|shares the favorable finding/.test(original))paragraphs.push(original);}
    }
    if(s.kind==='outlook'){
      paragraphs=[];const m=t.mida_outlook;
      if(valid(t.next_projected)&&valid(t.next_opponent_projected)){const gap=Number(t.next_projected)-Number(t.next_opponent_projected);paragraphs.push(t.team_name+' is projected for '+one(t.next_projected)+' against '+one(t.next_opponent_projected)+' for '+t.next_opponent_name+', '+(gap>=0?'favored':'the underdog')+' by '+one(Math.abs(gap))+'. '+(gap<0?'The lineup needs to outperform its forecast; relying on the opponent to collapse is not a plan.':'Protecting that edge starts with availability and avoiding preventable empty lineup slots.'));}
      if(m){paragraphs.push('MIDA outlook (as of '+m.source_date+'): playoffs '+(valid(m.playoff)?one(m.playoff)+'%':'n/a')+'; championship '+(valid(m.title)?one(m.title)+'%':'n/a')+'; division title '+(valid(m.division)?one(m.division)+'%':'n/a')+'.'+(valid(m.expected_wins)?' Expected wins: '+one(m.expected_wins)+'.':''));if(valid(m.playoff))paragraphs.push(t.team_name+(m.playoff>=70?' has a strong projected playoff position. The priority is converting roster strength into reliable weekly starts without overpaying for a single hot performance.':m.playoff>=40?' is in a competitive but insecure playoff position. Marginal lineup improvements matter, and sacrificing future value only makes sense for a clear upgrade.':' faces a difficult playoff path. One good Sunday is not a mandate to spend future assets; improving durable roster value matters more than chasing last week’s points.'));}
      const games=t.league_context?.recent_games||[];if(games.length>=2)paragraphs.push('The recent results for '+t.team_name+' are '+games.slice(-5).map(g=>'Week '+g.week+': '+g.result+(valid(g.points)?' ('+one(g.points)+' points)':'')).join(', ')+'. '+(t.league_context?.streak?.type==='W'?'The winning run supports confidence, but the next projection tests whether that momentum has a scoring foundation.':'The recent results make lineup efficiency more urgent; a rebound needs production, not merely a change in mood.'));
      if(!paragraphs.length)paragraphs=['n/a'];
    }
    return {...s,paragraphs};
  });
}
