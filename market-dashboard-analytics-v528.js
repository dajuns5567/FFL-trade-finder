(()=>{
'use strict';
// Market Dashboard analytics are strictly read-only projections of archived
// Value History marketRows. No player values, rankings, or snapshots are changed.
const PERIODS={'1D':'delta1','7D':'delta7','30D':'delta30','1Y':'delta365','ALL':'deltaAll'};
const POSITIONS=['QB','RB','WR','TE','IDP'];
const round=(v,n=1)=>Number(v.toFixed(n));
function compute(market,period='7D'){
  const key=PERIODS[period]||PERIODS['7D'];
  const source=Array.isArray(market?.marketRows)?market.marketRows:[];
  const usable=[];
  for(const row of source){
    const current=Number(row?.value),change=row?.[key]==null?NaN:Number(row[key]);
    const baseline=current-change,pos=POSITIONS.includes(String(row?.pos||'').toUpperCase())?String(row.pos).toUpperCase():'IDP';
    if(!Number.isFinite(current)||!Number.isFinite(change)||!Number.isFinite(baseline)||baseline<=0||current<0)continue;
    usable.push({id:String(row.id),pos,value:current,delta:change,percent:100*change/baseline,overall:Number(row.overall)});
  }
  const group=(items)=>{
    if(!items.length)return{count:0,up:0,down:0,flat:0,averagePct:null,averageAbsPct:null,netDelta:0,dispersionPct:null};
    let up=0,down=0,sum=0,absolute=0,netDelta=0;
    for(const v of items){if(v.delta>0)up++;else if(v.delta<0)down++;sum+=v.percent;absolute+=Math.abs(v.percent);netDelta+=v.delta}
    const avg=sum/items.length;
    return{count:items.length,up,down,flat:items.length-up-down,averagePct:round(avg,2),
      averageAbsPct:round(absolute/items.length,2),netDelta:round(netDelta,0),
      dispersionPct:round(Math.sqrt(items.reduce((n,v)=>n+(v.percent-avg)**2,0)/items.length),2)};
  };
  const summary=group(usable);
  const positions=POSITIONS.map(pos=>({pos,...group(usable.filter(v=>v.pos===pos))}));
  const movers=[...usable].sort((a,b)=>Math.abs(b.percent)-Math.abs(a.percent)||a.id.localeCompare(b.id)).slice(0,5);
  return{period,key,totalPlayers:source.length,available:usable.length,
    summary,positions,movers,hasHistory:usable.length>0&&Number(market?.snapshot_count)>=2};
}
// Market signals describe observed value movement, not fair-price gaps or
// trade instructions. They never feed back into valuation or trade scoring.
// Valid history is mandatory; missing movement is not interpreted as zero.
function opportunitySignals(market,{limit=5,pool=300}={}){
  const rows=Array.isArray(market?.marketRows)?market.marketRows:[];
  if(Number(market?.snapshot_count)<2)return{buyLow:[],sellHigh:[],reversals:[],eligible:0};
  const eligible=[];
  for(const row of rows){
    const value=Number(row?.value),overall=Number(row?.overall);
    const d7=row?.delta7==null?NaN:Number(row.delta7);
    const base7=value-d7;
    if(!Number.isFinite(value)||value<=0||!Number.isFinite(overall)||overall<1||overall>pool||
      !Number.isFinite(d7)||!Number.isFinite(base7)||base7<=0)continue;
    const d30=row?.delta30==null?NaN:Number(row.delta30);
    const base30=value-d30;
    const p30=Number.isFinite(d30)&&base30>0?100*d30/base30:null;
    eligible.push({id:String(row.id),pos:String(row.pos||'—').toUpperCase(),
      value,overall,delta7:d7,percent7:round(100*d7/base7,2),
      percent30:p30==null?null:round(p30,2)});
  }
  const byAbsDescending=(a,b)=>Math.abs(b.percent7)-Math.abs(a.percent7)||a.overall-b.overall||a.id.localeCompare(b.id);
  const buyLow=eligible.filter(r=>r.delta7<0).sort(byAbsDescending).slice(0,limit);
  const sellHigh=eligible.filter(r=>r.delta7>0).sort(byAbsDescending).slice(0,limit);
  const reversals=eligible.filter(r=>r.percent30!=null&&r.percent7*r.percent30<0)
    .sort(byAbsDescending).slice(0,limit);
  return{buyLow,sellHigh,reversals,eligible:eligible.length,
    pool,method:'Read-only 7-day observed value drawdowns and run-ups, not independent fair-value estimates'};
}
function renderOpportunitySignals(market,lookupPlayer){
  const signals=opportunitySignals(market);
  const name=id=>typeof lookupPlayer==='function'?lookupPlayer(id):'Player '+id;
  const list=(rows,kind)=>{
    if(!rows.length)return'<div class="vh-empty">No qualifying moves in verified snapshot history.</div>';
    return'<div class="vh-opportunity-list">'+rows.map((r,i)=>
      '<div class="vh-opportunity-row"><span class="vh-ranknum">'+(i+1)+'</span>'+
      '<button type="button" class="vh-player-link" data-vh-player="'+esc(r.id)+'"><b>'+
      esc(name(r.id))+'</b><small>'+esc(r.pos)+' • Overall #'+r.overall+
      ' • Value '+fmt(r.value)+'</small></button><div class="vh-opportunity-change '+(kind==='low'?'vh-down':'vh-up')+
      '"><b>'+pct(r.percent7)+'</b><small>7D'+(r.percent30==null?'':' • 30D '+pct(r.percent30))+'</small></div></div>'
    ).join('')+'</div>';
  };
  return'<section class="vh-card vh-analytics-panel" data-vh-market-opportunities>'+
    '<div class="vh-card-head"><div><h3>Buy Low & Sell High Watchlists</h3>'+
    '<div class="vh-sub">Observed value movement from the existing Value History snapshots • Top 300 overall players</div></div></div>'+
    '<div class="vh-opportunity-grid">'+
      '<div><h4>Buy Low Watchlist</h4><div class="vh-sub">Largest recent value declines • research potential rebounds, not automatic bargains</div>'+
      list(signals.buyLow,'low')+'</div>'+
      '<div><h4>Sell High Watchlist</h4><div class="vh-sub">Largest recent value gains • research potential exits, not automatic overvaluations</div>'+
      list(signals.sellHigh,'high')+'</div>'+
    '</div><div class="vh-sub">Signals cover '+fmt(signals.eligible)+' players with comparable recent values. A falling value does not prove a player is underpriced; a rising value does not prove a player is overpriced. Open a player to inspect actual Value History before making a trade.</div></section>';
}
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:0});
const pct=n=>n==null?'—':((n>0?'+':'')+Number(n).toFixed(1)+'%');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(market,period='7D',lookupPlayer){
  const a=compute(market,period);
  const buttons=Object.keys(PERIODS).map(p=>'<button type="button" class="'+(p===period?'':'secondary ')+'small" data-vh-analytics-period="'+p+'" aria-pressed="'+(p===period)+'">'+(p==='1Y'?'1 Year':p==='ALL'?'All':p)+'</button>').join('');
  if(!a.hasHistory){
    return'<section class="vh-card vh-analytics-panel" data-vh-market-analytics><div class="vh-card-head"><div><h3>Market Heat Map & Volatility</h3><div class="vh-sub">Read-only analytics from recorded Value History snapshots</div></div><div class="vh-card-periods">'+buttons+'</div></div><div class="vh-empty">At least two verified Value History snapshots with comparable player values are needed. No market movement has been inferred.</div></section>';
  }
  const s=a.summary,all=Number(s.count)||1;
  const cells=a.positions.map(x=>{
    const color=x.averagePct==null?'neutral':x.averagePct>0?'up':x.averagePct<0?'down':'flat';
    const strength=Math.min(1,Math.abs(Number(x.averagePct)||0)/15);
    const opacity=(.10+.30*strength).toFixed(3);
    return'<div class="vh-heat-cell '+color+'" data-vh-heat-position="'+esc(x.pos)+'" style="--vh-heat-opacity:'+opacity+'"><b>'+esc(x.pos)+'</b><strong>'+pct(x.averagePct)+'</strong><small>'+fmt(x.count)+' players • '+x.up+' up / '+x.down+' down</small></div>';
  }).join('');
  const extreme=a.movers.map(x=>'<div class="vh-mover"><button type="button" class="vh-player-link" data-vh-player="'+esc(x.id)+'">'+esc(String(x.pos))+' • Player '+esc(x.id)+'</button><strong class="'+(x.delta>0?'vh-up':x.delta<0?'vh-down':'vh-neutral')+'">'+pct(x.percent)+'</strong></div>').join('');
  return'<section class="vh-card vh-analytics-panel" data-vh-market-analytics>'+
    '<div class="vh-card-head"><div><h3>Market Heat Map & Volatility</h3><div class="vh-sub">Completed Value History snapshots • '+esc(period==='ALL'?'all available history':period==='1Y'?'1 year':period)+' comparison</div></div><div class="vh-card-periods">'+buttons+'</div></div>'+
    '<div class="vh-analytics-metrics">'+
      '<div><small>Market breadth</small><strong>'+s.up+' rising / '+s.down+' falling</strong><span>'+s.flat+' unchanged • '+fmt(s.count)+' covered</span></div>'+
      '<div><small>Market volatility</small><strong>'+pct(s.averageAbsPct)+'</strong><span>Average absolute player value % move</span></div>'+
      '<div><small>Market direction</small><strong>'+pct(s.averagePct)+'</strong><span>Average signed player value % move</span></div>'+
      '<div><small>Market dispersion</small><strong>'+pct(s.dispersionPct)+'</strong><span>Std. deviation of player % moves</span></div>'+
    '</div>'+
    '<div class="vh-analytics-section-title"><h4>Positional Market Heat Map</h4><span>Average percentage value change by position</span></div>'+
    '<div class="vh-heat-grid">'+cells+'</div>'+
    '<div class="vh-analytics-breadth" role="img" aria-label="'+s.up+' rising, '+s.down+' falling, '+s.flat+' unchanged out of '+s.count+' comparable players"><div class="vh-analytics-up" style="width:'+(s.up/all*100).toFixed(2)+'%"></div><div class="vh-analytics-flat" style="width:'+(s.flat/all*100).toFixed(2)+'%"></div><div class="vh-analytics-down" style="width:'+(s.down/all*100).toFixed(2)+'%"></div></div>'+
    '<div class="vh-sub">Market breadth: '+s.up+' gainers · '+s.flat+' unchanged · '+s.down+' decliners. Volatility is cross-sectional movement intensity, not a time-series forecast. '+fmt(a.available)+' of '+fmt(a.totalPlayers)+' current market players have comparable historical values.</div>'+
    '</section>'+renderOpportunitySignals(market,lookupPlayer);
}
function installStyles(){
  if(document.getElementById('vhMarketAnalyticsStyles528'))return;
  const style=document.createElement('style');style.id='vhMarketAnalyticsStyles528';
  style.textContent='#valueHistory .vh-analytics-panel{margin-bottom:16px}'+
    '#valueHistory .vh-analytics-panel .vh-card-head{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}'+
    '#valueHistory .vh-analytics-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}'+
    '#valueHistory .vh-analytics-metrics>div{border:1px solid var(--line);border-radius:9px;padding:12px;display:flex;flex-direction:column;gap:5px;min-width:0}'+
    '#valueHistory .vh-analytics-metrics small{color:#e4b53f;text-transform:uppercase;font-weight:800;font-size:10px}'+
    '#valueHistory .vh-analytics-metrics strong{font-size:20px;font-variant-numeric:tabular-nums}'+
    '#valueHistory .vh-analytics-metrics span{font-size:11px;color:var(--muted)}'+
    '#valueHistory .vh-analytics-section-title{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}'+
    '#valueHistory .vh-analytics-section-title h4{margin:0 0 10px}'+
    '#valueHistory .vh-analytics-section-title span{font-size:11px;color:var(--muted)}'+
    '#valueHistory .vh-heat-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:8px 0 14px}'+
    '#valueHistory .vh-heat-cell{border:1px solid var(--line);border-radius:10px;min-height:96px;padding:12px;display:flex;flex-direction:column;gap:7px;background:var(--card)}'+
    '#valueHistory .vh-heat-cell.up{background:linear-gradient(rgba(31,157,104,var(--vh-heat-opacity)),rgba(31,157,104,var(--vh-heat-opacity))),var(--card)}'+
    '#valueHistory .vh-heat-cell.down{background:linear-gradient(rgba(196,81,81,var(--vh-heat-opacity)),rgba(196,81,81,var(--vh-heat-opacity))),var(--card)}'+
    '#valueHistory .vh-heat-cell strong{font-size:22px;font-variant-numeric:tabular-nums}'+
    '#valueHistory .vh-heat-cell small{font-size:11px;color:var(--muted)}'+
    '#valueHistory .vh-analytics-breadth{display:flex;width:100%;height:10px;border-radius:10px;overflow:hidden;background:var(--line);margin:12px 0 9px}'+
    '#valueHistory .vh-analytics-up{background:var(--good,#1f9d68)}#valueHistory .vh-analytics-flat{background:var(--muted)}#valueHistory .vh-analytics-down{background:var(--bad,#c45151)}'+
    '#valueHistory .vh-opportunity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:12px 0}'+
    '#valueHistory .vh-opportunity-grid>div{min-width:0;border:1px solid var(--line);border-radius:10px;padding:12px}'+
    '#valueHistory .vh-opportunity-grid h4{margin:0 0 6px;color:#e4b53f}'+
    '#valueHistory .vh-opportunity-list{display:grid;gap:4px;margin-top:12px}'+
    '#valueHistory .vh-opportunity-row{display:flex;align-items:center;gap:9px;min-width:0;padding:8px 0;border-top:1px solid var(--line)}'+
    '#valueHistory .vh-opportunity-row .vh-player-link{min-width:0;flex:1;text-align:left}'+
    '#valueHistory .vh-opportunity-row .vh-player-link b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
    '#valueHistory .vh-opportunity-row small{display:block;color:var(--muted);font-size:10px}'+
    '#valueHistory .vh-opportunity-change{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}'+
    '@media(max-width:850px){#valueHistory .vh-analytics-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#valueHistory .vh-heat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#valueHistory .vh-opportunity-grid{grid-template-columns:minmax(0,1fr)}}';
  document.head.appendChild(style);
}
window.marketDashboardAnalyticsV528={compute,opportunitySignals,render,installStyles,periods:Object.keys(PERIODS)};
})();