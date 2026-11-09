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
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:0});
const pct=n=>n==null?'—':((n>0?'+':'')+Number(n).toFixed(1)+'%');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(market,period='7D'){
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
    '</section>';
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
    '@media(max-width:850px){#valueHistory .vh-analytics-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#valueHistory .vh-heat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';
  document.head.appendChild(style);
}
window.marketDashboardAnalyticsV528={compute,render,installStyles,periods:Object.keys(PERIODS)};
})();