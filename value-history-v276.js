(()=>{
'use strict';
const API='/.netlify/functions/value-history';
let installed=false,uiReady=false,snapshotTimer=null,marketCache=null,currentPlayerId=null,trackedTeamId=null,currentView='market',marketSort={key:'value',dir:-1},teamNetSort={key:'value',dir:-1},teamAttributionPeriod='7D',tradeHistoryCache=null,tradeTeamFilter='',marketPeriods={valueRisers:'7D',valueFallers:'7D',rankRisers:'30D',rankFallers:'30D'},teamPeriods={valueRisers:'7D',valueFallers:'7D',rankRisers:'30D',rankFallers:'30D',posRankRisers:'30D',posRankFallers:'30D'},marketPools={valueRisers:'ALL',valueFallers:'ALL',rankRisers:'ALL',rankFallers:'ALL'},teamPools={valueRisers:'ALL',valueFallers:'ALL',rankRisers:'ALL',rankFallers:'ALL',posRankRisers:'ALL',posRankFallers:'ALL'},playerScoringCache=new Map(),teamNetCache=new Map(),tradeDetailState=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tv=()=>window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const signed=n=>{const v=Number(n)||0;return`${v>0?'+':''}${fmt(v)}`};
const signedPct=n=>{const v=Number(n)||0;return`${v>0?'+':''}${v.toFixed(1)}%`};
const dateShort=t=>{try{return new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}catch{return'—'}};
const dateTime=t=>{try{return new Date(t).toLocaleString()}catch{return'—'}};

function addStyles(){
  if(document.getElementById('vhHubStyles'))return;
  const st=document.createElement('style');st.id='vhHubStyles';
  st.textContent=`
  #valueHistory>.card{border:0!important;background:color-mix(in srgb,var(--card) 72%,#06080c);box-shadow:none!important}
  #valueHistory #vhContent{display:grid;gap:16px}
  #valueHistory .vh-grid,#valueHistory .vh-grid-2,#valueHistory .vh-rank-grid{margin:0}
  #valueHistory .vh-shell{display:grid;gap:16px}
  #valueHistory .vh-control-row{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;margin:4px 0 0;padding-bottom:4px}
  #valueHistory .vh-hero{display:block;margin:0 0 4px}
  #valueHistory .vh-search-wrap{width:min(620px,100%);transition:width .18s ease}
  #valueHistory .vh-search-wrap.vh-player-selected{width:min(470px,100%)}
  #valueHistory .vh-search-wrap label b{display:block;font-size:15px;font-weight:900;letter-spacing:.02em;color:#f4f4f5;margin-bottom:3px}
  #valueHistory .vh-search-wrap input{margin:7px 0 0;border-color:color-mix(in srgb,#e4b53f 22%,var(--line))!important;box-shadow:none!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
  #valueHistory .vh-search-wrap.vh-player-selected input{min-height:44px;padding:10px 14px;border-color:color-mix(in srgb,#e4b53f 38%,var(--line))!important;border-radius:10px!important;background:linear-gradient(180deg,color-mix(in srgb,#e4b53f 5%,var(--card)),color-mix(in srgb,var(--card) 97%,black))!important;color:#f4f4f5!important;font-size:17px!important;font-weight:850!important;letter-spacing:.005em!important}
  #valueHistory .vh-search-wrap.vh-player-selected label b{font-size:11px;color:#e4b53f;text-transform:uppercase;letter-spacing:.07em;margin-bottom:1px}
  #valueHistory .vh-search-wrap input:focus,#valueHistory .vh-search-wrap input:focus-visible,#valueHistory input[type="search"]:focus,#valueHistory input[type="search"]:focus-visible{outline:none!important;border-color:#e4b53f!important;box-shadow:0 0 0 2px rgba(228,181,63,.30),0 0 18px rgba(228,181,63,.20)!important}
  #valueHistory .vh-status{font-size:12px;color:var(--muted);text-align:right;line-height:1.45;padding:0 2px;white-space:nowrap}
  #valueHistory .vh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
  #valueHistory .vh-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:stretch}
  #valueHistory .vh-card-head{display:grid;grid-template-columns:1fr;gap:10px;align-content:start}
  #valueHistory .vh-mover-card{height:100%;border-left:2px solid color-mix(in srgb,#e4b53f 48%,var(--line))}
  #valueHistory .vh-mover-card .vh-card-head{min-height:102px}
  #valueHistory .vh-mover-card .vh-card-actions{align-self:end}
  #valueHistory .vh-card-periods{display:flex;gap:4px;flex-wrap:wrap}
  #valueHistory .vh-card-periods button{padding:6px 9px;min-width:0;font-size:12px;font-weight:800}
  #valueHistory .vh-card-periods button:not(.secondary){color:#e4b53f!important;background:color-mix(in srgb,#e4b53f 15%,var(--card))!important;border-color:color-mix(in srgb,#e4b53f 52%,var(--line))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,#e4b53f 28%,transparent),0 3px 10px rgba(0,0,0,.16)!important}
  #valueHistory .vh-pool-filter{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:3px}
  #valueHistory .vh-pool-filter>span{font-size:10px;font-weight:900;letter-spacing:.065em;text-transform:uppercase;color:var(--muted);margin-right:2px}
  #valueHistory .vh-pool-filter button{padding:4px 7px;min-width:0;font-size:10px;font-weight:800}
  #valueHistory .vh-pool-filter button:not(.secondary){color:#e4b53f!important;background:color-mix(in srgb,#e4b53f 15%,var(--card))!important;border-color:color-mix(in srgb,#e4b53f 52%,var(--line))!important}
  #valueHistory .vh-market-table summary{cursor:pointer;color:#e4b53f;font-size:17px;font-weight:900;letter-spacing:.075em;text-transform:uppercase;padding:4px 0 8px;border-bottom:1px solid color-mix(in srgb,#e4b53f 28%,var(--line));list-style-position:inside}
  #valueHistory .vh-market-table summary::marker{color:#e4b53f}
  #valueHistory .vh-market-table summary{display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none}
  #valueHistory .vh-market-table summary::-webkit-details-marker{display:none}
  #valueHistory .vh-details-state{font-size:11px;font-weight:900;letter-spacing:.06em;color:#e4b53f}
  #valueHistory .vh-state-close{display:none}
  #valueHistory .vh-market-table[open] .vh-state-open{display:none}
  #valueHistory .vh-market-table[open] .vh-state-close{display:inline}
  #valueHistory .vh-selected-divider b{display:block;font-size:14px}
  #valueHistory .vh-selected-divider small{display:block;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:0;margin-top:3px}
  #valueHistory .vh-card{position:relative;border:1px solid var(--line);background:var(--card);border-radius:14px;padding:14px;min-width:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.018)}
  #valueHistory .vh-card:before{content:"";position:absolute;left:18px;right:18px;top:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(228,181,63,.26),transparent);pointer-events:none}
  #valueHistory .vh-card h3{margin:0 0 5px;font-size:16px;font-weight:850;letter-spacing:.01em;color:#f4f4f5}
  #valueHistory .vh-card-head>div>h3,#valueHistory .vh-section-heading{font-size:17px!important;color:#e4b53f!important;font-weight:900!important;letter-spacing:.075em!important;text-transform:uppercase;margin-bottom:6px!important}
  #valueHistory .vh-similar-title{font-size:20px!important;color:#e4b53f!important;font-weight:900!important;letter-spacing:.075em!important;text-transform:uppercase;margin-bottom:5px!important}
  #valueHistory .vh-filter-card{padding:14px 16px}
  #valueHistory .vh-filter-label{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#e4b53f;margin-bottom:9px}
  #valueHistory .vh-card .vh-sub{font-size:12px;color:var(--muted);margin-bottom:10px}
  #valueHistory .vh-list{display:grid;gap:5px}
  #valueHistory .vh-mover{display:grid;grid-template-columns:26px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--line) 70%,transparent)}
  #valueHistory .vh-mover:first-child{border-top:0}
  #valueHistory .vh-ranknum{font-size:17px;font-weight:950;color:#f0bc28;text-align:center;font-variant-numeric:tabular-nums;line-height:1;-webkit-text-stroke:.7px #05070a;text-shadow:-1px -1px 0 #05070a,1px -1px 0 #05070a,-1px 1px 0 #05070a,1px 1px 0 #05070a}
  #valueHistory .vh-player-link{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;color:inherit!important;text-align:left;font:inherit;cursor:pointer;min-width:0;outline:0}
  #valueHistory .vh-player-link:hover{text-decoration:underline}
  #valueHistory .vh-player-link b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #valueHistory .vh-player-link small{color:var(--muted)}
  #valueHistory .vh-delta{font-weight:700;font-variant-numeric:tabular-nums;text-align:right}
  #valueHistory .vh-up{color:var(--good,#1f9d68)}
  #valueHistory .vh-down{color:var(--bad,#c45151)}
  #valueHistory .vh-neutral{color:var(--muted)}
  #valueHistory .vh-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  #valueHistory .vh-profile-info{display:grid;grid-template-columns:minmax(210px,1.15fr) minmax(560px,3.8fr) minmax(165px,.9fr);gap:0;align-items:stretch}
  #valueHistory .vh-profile-primary{display:flex;flex-direction:column;justify-content:center;min-width:0;padding-right:20px}
  #valueHistory .vh-profile-primary h2{margin:0 0 10px;font-size:24px;line-height:1.08}
  #valueHistory .vh-profile-kicker{display:flex;gap:6px;flex-wrap:wrap}
  #valueHistory .vh-profile-kicker span{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--card) 90%,transparent);font-size:12px;color:var(--muted)}
  #valueHistory .vh-profile-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
  #valueHistory .vh-profile-fact{border-left:1px solid var(--line);padding:10px 16px;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
  #valueHistory .vh-profile-fact small{color:#e4b53f;font-size:12px;font-weight:900;letter-spacing:.075em;text-transform:uppercase;margin-bottom:7px}
  #valueHistory .vh-profile-fact b{font-size:15px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
  #valueHistory .vh-profile-fact span{font-size:12px;color:var(--muted);margin-top:4px}
  #valueHistory .vh-current{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;border-left:1px solid var(--line);padding:10px 16px;min-width:0}
  #valueHistory .vh-current small{font-size:12px;font-weight:900;letter-spacing:.075em;text-transform:uppercase;color:#e4b53f!important;margin-bottom:7px;line-height:1.2}
  #valueHistory .vh-current .vh-big{font-size:36px;font-weight:900;line-height:1}
  #valueHistory .vh-rank-chart svg{display:block;width:100%;height:auto}
  #valueHistory .vh-rank-chart .vh-axis{stroke:currentColor;opacity:.25}
  #valueHistory .vh-rank-chart .vh-axis-text{fill:currentColor;font-size:10px;opacity:.72}
  #valueHistory .vh-rank-chart .vh-rank-line{fill:none;stroke:#e4b53f;stroke-width:3;vector-effect:non-scaling-stroke}
  #valueHistory .vh-rank-chart .vh-rank-dot{fill:#e4b53f;stroke:var(--card);stroke-width:1.5}
  #valueHistory .vh-periods{display:flex;gap:6px;flex-wrap:wrap}
  #valueHistory .vh-periods button{min-width:58px;padding:8px 12px;font-weight:800}
  #valueHistory .vh-periods button:not(.secondary){color:#e4b53f!important;background:color-mix(in srgb,#e4b53f 15%,var(--card))!important;border-color:color-mix(in srgb,#e4b53f 55%,var(--line))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,#e4b53f 28%,transparent),0 3px 10px rgba(0,0,0,.16)!important}
  #valueHistory .vh-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
  #valueHistory .vh-metric{border:1px solid var(--line);border-radius:12px;padding:12px 10px;background:color-mix(in srgb,var(--card) 92%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:82px}
  #valueHistory .vh-metric>small{display:flex;align-items:center;justify-content:center;min-height:28px;color:#e4b53f;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;text-align:center}
  #valueHistory .vh-metric b{font-size:18px}
  #valueHistory .vh-metric .vh-metric-time{font-size:10px;color:var(--muted);margin-top:5px;line-height:1.25}
  #valueHistory .vh-chart-card{padding:12px}
  #valueHistory .vh-chart-card svg{display:block;width:100%;height:auto;border-radius:10px}
  #valueHistory .vh-value-chart{position:relative;padding-top:98px}
  #valueHistory .vh-value-axis{fill:currentColor;font-size:13px;font-weight:700;opacity:.88}
  #valueHistory .vh-refresh-callout{position:absolute;right:16px;top:4px;z-index:4;min-width:260px;max-width:calc(100% - 32px);padding:12px 14px;border:1px solid color-mix(in srgb,#e4b53f 52%,var(--line));border-radius:12px;background:linear-gradient(180deg,color-mix(in srgb,#e4b53f 8%,var(--card)),color-mix(in srgb,var(--card) 96%,black));box-shadow:0 8px 24px rgba(0,0,0,.24)}
  #valueHistory .vh-refresh-callout .vh-refresh-label{display:block;text-align:center;color:#e4b53f;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;margin-bottom:8px}
  #valueHistory .vh-refresh-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  #valueHistory .vh-refresh-metric{padding:8px 10px;border:1px solid color-mix(in srgb,var(--line) 82%,transparent);border-radius:9px;background:color-mix(in srgb,var(--card) 90%,transparent)}
  #valueHistory .vh-refresh-metric small{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:800;margin-bottom:3px}
  #valueHistory .vh-refresh-metric strong{font-size:17px;line-height:1}
  #valueHistory .vh-point-hit{fill:transparent;stroke:transparent;cursor:crosshair;pointer-events:all}
  #valueHistory .vh-point-dot{fill:#e4b53f;stroke:var(--card);stroke-width:2;pointer-events:none}
  #valueHistory .vh-chart-tooltip{position:absolute;z-index:6;display:none;pointer-events:none;min-width:180px;max-width:260px;padding:9px 11px;border:1px solid color-mix(in srgb,#e4b53f 65%,var(--line));border-radius:10px;background:color-mix(in srgb,var(--card) 96%,black);box-shadow:0 8px 24px rgba(0,0,0,.28);font-size:12px;line-height:1.45;transform:translate(10px,-50%)}
  #valueHistory .vh-chart-tooltip b{display:block;color:#e4b53f;font-size:13px;margin-bottom:2px}
  #valueHistory .vh-view-chart{white-space:nowrap;padding:5px 8px!important;font-size:11px!important;min-width:0!important}
  #valueHistory .vh-chart-col{width:72px;min-width:72px;text-align:center!important}
  #valueHistory .vh-overall-cell{display:inline-flex;align-items:center;justify-content:flex-end;gap:5px}
  #valueHistory .vh-rank-arrow{font-size:12px;font-weight:900;line-height:1}
  #valueHistory .vh-rank-arrow.vh-up{color:var(--good,#1f9d68)}
  #valueHistory .vh-rank-arrow.vh-down{color:var(--bad,#c45151)}
  #valueHistory .vh-subnav{display:inline-flex;gap:4px;align-items:center;width:max-content;max-width:100%;padding:5px;border:1px solid color-mix(in srgb,#e4b53f 26%,var(--line));border-radius:14px;background:color-mix(in srgb,var(--card) 88%,black);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
  #valueHistory .vh-subnav button{border:0!important;border-radius:9px!important;padding:9px 16px!important;min-height:36px;background:transparent!important;color:var(--muted)!important;box-shadow:none!important;font-size:12px!important;font-weight:800}
  #valueHistory .vh-subnav button:hover{color:inherit!important;background:color-mix(in srgb,var(--card) 72%,white 4%)!important}
  #valueHistory .vh-subnav button.vh-subnav-active{color:#e4b53f!important;background:color-mix(in srgb,#e4b53f 14%,var(--card))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,#e4b53f 42%,transparent),0 3px 12px rgba(0,0,0,.18)!important}
  #valueHistory .vh-team-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
  #valueHistory .vh-team-toolbar label{min-width:280px;flex:1}
  #valueHistory .vh-team-picker{border-color:color-mix(in srgb,#e4b53f 28%,var(--line));background:var(--card)}
  #valueHistory .vh-team-picker h3{color:#e4b53f}
  #valueHistory .vh-team-toolbar select,#valueHistory #vhMarketSearch{border-color:color-mix(in srgb,#e4b53f 22%,var(--line))!important;box-shadow:none!important}
  #valueHistory .vh-team-toolbar select:focus,#valueHistory .vh-team-toolbar select:focus-visible,#valueHistory #vhMarketSearch:focus,#valueHistory #vhMarketSearch:focus-visible{outline:none!important;border-color:#e4b53f!important;box-shadow:0 0 0 2px rgba(228,181,63,.30),0 0 18px rgba(228,181,63,.18)!important}
  #valueHistory .vh-similar-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #valueHistory .vh-neighbor-list{display:grid;gap:6px}
  #valueHistory .vh-neighbor-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
  #valueHistory .vh-neighbor-row:first-child{border-top:0}
  #valueHistory .vh-neighbor-row small{display:block;color:var(--muted)}
  #valueHistory .vh-selected-divider{padding:9px 10px;margin:2px 0;border-top:1px solid color-mix(in srgb,#e4b53f 40%,var(--line));border-bottom:1px solid color-mix(in srgb,#e4b53f 40%,var(--line));color:#e4b53f;font-weight:900;letter-spacing:.035em;text-align:center;background:transparent}
  #valueHistory .vh-rank-hit{fill:transparent;stroke:transparent;cursor:crosshair;pointer-events:all}
  #valueHistory .vh-card-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  #valueHistory .vh-view-all{white-space:nowrap}
  #valueHistory .vh-modal-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:24px}
  #valueHistory .vh-modal{width:min(860px,96vw);max-height:min(82vh,900px);overflow:hidden;border:1px solid var(--line);border-radius:16px;background:var(--card);box-shadow:0 24px 80px rgba(0,0,0,.5);display:grid;grid-template-rows:auto 1fr}
  #valueHistory .vh-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--line)}
  #valueHistory .vh-modal-head h3{margin:0 0 3px}
  #valueHistory .vh-modal-body{overflow:auto;padding:8px 18px 18px}
  #valueHistory .vh-modal .vh-mover{grid-template-columns:26px minmax(0,1fr) auto auto}
  #valueHistory .vh-rank-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #valueHistory .vh-rank-stat{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
  #valueHistory .vh-rank-stat b{font-size:20px}
  #valueHistory .vh-feed{display:grid;gap:0}
  #valueHistory .vh-feed-row{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:10px 0;border-top:1px solid var(--line);font-size:13px}
  #valueHistory .vh-feed-row:first-child{border-top:0}
  #valueHistory .vh-milestone-label{display:flex;flex-direction:column;gap:4px;min-width:0}
  #valueHistory .vh-milestone-time{display:block;color:var(--muted);font-size:10px;line-height:1.3}
  #valueHistory .vh-feed-row>b{flex:0 0 auto;text-align:right}
  #valueHistory .vh-net-card{padding:16px 18px}
  #valueHistory .vh-net-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:8px}
  #valueHistory .vh-net-total{text-align:right}
  #valueHistory .vh-net-total small{display:block;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
  #valueHistory .vh-net-total b{display:block;font-size:24px;line-height:1;color:#f4f4f5}
  #valueHistory .vh-net-chart svg{display:block;width:100%;height:142px}
  #valueHistory .vh-net-line{fill:none;stroke:#e4b53f;stroke-width:3;vector-effect:non-scaling-stroke}
  #valueHistory .vh-net-dot{fill:#e4b53f;stroke:var(--card);stroke-width:1.5}
  #valueHistory .vh-net-axis{stroke:currentColor;opacity:.22}
  #valueHistory .vh-net-axis-text{fill:currentColor;font-size:10px;opacity:.72}
  #valueHistory .vh-net-note{margin-top:6px;color:var(--muted);font-size:10px;line-height:1.35}
  #valueHistory .vh-net-chart{position:relative}
  #valueHistory .vh-net-hit{fill:transparent;stroke:transparent;pointer-events:all;cursor:crosshair}
  #valueHistory .vh-net-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0 12px}
  #valueHistory .vh-net-metric{border:1px solid var(--line);border-radius:10px;padding:9px 10px;text-align:center;background:color-mix(in srgb,var(--card) 94%,transparent)}
  #valueHistory .vh-net-metric small{display:block;color:#e4b53f;font-size:10px;font-weight:900;letter-spacing:.065em;text-transform:uppercase;margin-bottom:4px}
  #valueHistory .vh-net-metric b{display:block;font-size:17px}
  #valueHistory .vh-net-metric span{display:block;color:var(--muted);font-size:10px;margin-top:3px}
  #valueHistory .vh-team-neighbors{border-top:1px solid var(--line);padding-top:12px;margin-top:8px}
  #valueHistory .vh-team-neighbors-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
  #valueHistory .vh-team-neighbors-head h4{margin:0;color:#e4b53f;font-size:12px;font-weight:900;letter-spacing:.065em;text-transform:uppercase}
  #valueHistory .vh-team-neighbor-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;align-items:stretch}
  #valueHistory .vh-team-neighbor{border:1px solid var(--line);border-radius:9px;padding:8px;text-align:center;min-width:0}
  #valueHistory .vh-team-neighbor.current{border-color:color-mix(in srgb,#e4b53f 55%,var(--line));background:color-mix(in srgb,#e4b53f 8%,var(--card))}
  #valueHistory .vh-team-neighbor small{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em}
  #valueHistory .vh-team-neighbor b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:3px 0}
  #valueHistory .vh-team-neighbor strong{font-size:14px}
  #valueHistory .vh-team-net-table{display:grid;min-width:720px}
  #valueHistory .vh-team-net-row{display:grid;grid-template-columns:50px minmax(190px,1.6fr) 110px 100px 100px 112px;gap:10px;align-items:center;padding:9px 8px;border-top:1px solid color-mix(in srgb,var(--line) 72%,transparent);font-size:12px}
  #valueHistory .vh-team-net-row:first-child{border-top:0}
  #valueHistory .vh-team-net-row.vh-team-net-head{position:sticky;top:0;z-index:2;background:var(--card);font-size:10px;font-weight:900;letter-spacing:.055em;text-transform:uppercase;color:var(--muted)}
  #valueHistory .vh-team-net-row>div:not(:nth-child(2)){text-align:right;font-variant-numeric:tabular-nums}
  #valueHistory .vh-team-net-row>div:first-child{text-align:center;color:#e4b53f;font-weight:900}
  #valueHistory .vh-team-net-row b{font-size:13px}
  #valueHistory .vh-team-net-sort{background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important;color:inherit!important;font:inherit!important;text-transform:inherit;letter-spacing:inherit;cursor:pointer}
  #valueHistory .vh-team-net-sort:hover{color:#e4b53f!important}
  #valueHistory .vh-attribution-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0 14px}
  #valueHistory .vh-attribution-stat{border:1px solid var(--line);border-radius:10px;padding:10px;text-align:center}
  #valueHistory .vh-attribution-stat small{display:block;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
  #valueHistory .vh-attribution-stat b{display:block;font-size:18px;margin-top:4px}
  #valueHistory .vh-driver-list{display:grid;gap:5px}
  #valueHistory .vh-driver-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--line) 72%,transparent)}
  #valueHistory .vh-driver-row:first-child{border-top:0}
  #valueHistory .vh-driver-row small{display:block;color:var(--muted)}
  #valueHistory .vh-driver-row>div.vh-up>b{color:var(--good,#1f9d68)!important}
  #valueHistory .vh-driver-row>div.vh-down>b{color:var(--bad,#c45151)!important}
  #valueHistory .vh-driver-row>div.vh-neutral>b{color:var(--muted)!important}
  #valueHistory .vh-team-trade-events{margin-top:16px;padding-top:14px;border-top:1px solid color-mix(in srgb,#e4b53f 28%,var(--line))}
  #valueHistory .vh-team-trade-events-head{margin-bottom:7px}
  #valueHistory .vh-team-trade-events-head h3{color:#e4b53f;font-size:14px;text-transform:uppercase;letter-spacing:.055em}
  #valueHistory .vh-team-trade-event{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid color-mix(in srgb,var(--line) 72%,transparent)}
  #valueHistory .vh-team-trade-event:first-of-type{border-top:0}
  #valueHistory .vh-team-trade-event-main{display:flex;align-items:center;gap:9px;min-width:0}
  #valueHistory .vh-team-trade-event-main b{display:block;font-size:12px}
  #valueHistory .vh-team-trade-event-main small{display:block;color:var(--muted);margin-top:2px;font-size:10px}
  #valueHistory .vh-trade-event-badge{display:inline-flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,#e4b53f 65%,var(--line));border-radius:999px;padding:3px 7px;color:#e4b53f;background:color-mix(in srgb,#e4b53f 8%,var(--card));font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
  #valueHistory .vh-team-trade-event-value{text-align:right;font-variant-numeric:tabular-nums}
  #valueHistory .vh-team-trade-event-value small,#valueHistory .vh-team-trade-event-value span{display:block;font-size:9px;color:var(--muted)}
  #valueHistory .vh-team-trade-event-value b{display:block;font-size:16px;margin:2px 0}
  #valueHistory .vh-team-trade-event-value span.vh-up{color:var(--good,#1f9d68)}
  #valueHistory .vh-team-trade-event-value span.vh-down{color:var(--bad,#c45151)}
  #valueHistory .vh-net-trade-dot{stroke:#e4b53f;stroke-width:2.2;filter:drop-shadow(0 0 3px rgba(228,181,63,.45))}
  #valueHistory .vh-tooltip-trades{margin-top:7px;padding-top:7px;border-top:1px solid color-mix(in srgb,#e4b53f 34%,var(--line))}
  #valueHistory .vh-tooltip-trades>small{display:block;color:var(--muted);font-size:9px;line-height:1.35;margin-top:4px}
  #valueHistory .vh-tooltip-trade{margin-top:4px;font-size:10px}
  @media(max-width:700px){#valueHistory .vh-team-trade-event{grid-template-columns:1fr}#valueHistory .vh-team-trade-event-value{text-align:left}}
  #valueHistory .vh-trade-list{display:grid;gap:28px}
  #valueHistory .vh-trade-card{border:2px solid color-mix(in srgb,#e4b53f 30%,var(--line));border-radius:15px;padding:0 14px 14px;background:color-mix(in srgb,var(--card) 96%,black);box-shadow:0 10px 24px rgba(0,0,0,.22),0 0 0 1px rgba(255,255,255,.015);overflow:hidden}
  #valueHistory .vh-trade-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin:0 -14px 14px;padding:13px 14px 12px;background:color-mix(in srgb,#e4b53f 7%,var(--card));border-bottom:1px solid color-mix(in srgb,#e4b53f 34%,var(--line))}
  #valueHistory .vh-trade-head h4{margin:0;color:#e4b53f;font-size:15px}
  #valueHistory .vh-compact-trade{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 10px}
  #valueHistory .vh-compact-side{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:color-mix(in srgb,var(--card) 97%,black);min-width:0}
  #valueHistory .vh-compact-side>b{display:block;font-size:13px;color:#f4f4f5;margin-bottom:6px}
  #valueHistory .vh-compact-assets{display:flex;gap:6px;flex-wrap:wrap}
  #valueHistory .vh-compact-asset{display:inline-flex;flex-direction:column;align-items:flex-start;justify-content:center;min-height:30px;padding:5px 8px;border:1px solid color-mix(in srgb,#e4b53f 24%,var(--line));border-radius:10px;background:color-mix(in srgb,#e4b53f 5%,var(--card));font-size:11px;font-weight:750;color:var(--muted);line-height:1.2}
  #valueHistory .vh-compact-asset>b{color:#f4f4f5;font-size:11px}
  #valueHistory .vh-compact-asset>small{display:block;margin-top:2px;color:var(--muted);font-size:9px;font-weight:750;letter-spacing:.02em}
  #valueHistory .vh-trade-toggle-row{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
  #valueHistory .vh-trade-toggle{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;min-width:150px;font-weight:900}
  #valueHistory .vh-trade-toggle-active{color:#f2c75d!important;background:color-mix(in srgb,#e4b53f 14%,var(--card))!important;border-color:color-mix(in srgb,#e4b53f 58%,var(--line))!important;box-shadow:inset 0 0 0 1px rgba(228,181,63,.10),0 0 0 1px rgba(228,181,63,.08)!important}
  #valueHistory .vh-trade-toggle-active:hover{background:color-mix(in srgb,#e4b53f 18%,var(--card))!important;border-color:#e4b53f!important}
  #valueHistory .vh-trade-toggle span{font-size:11px;opacity:.8}
  #valueHistory .vh-trade-collapsed{padding-bottom:10px}
  #valueHistory .vh-trade-collapsed .vh-trade-head{margin-bottom:10px}
  #valueHistory .vh-trade-expanded .vh-history-section{margin-top:12px}
  @media(max-width:900px){#valueHistory .vh-compact-trade{grid-template-columns:1fr}}

  #valueHistory .vh-trade-sides{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #valueHistory .vh-trade-side{border:1px solid var(--line);border-radius:10px;padding:10px;min-width:0}
  #valueHistory .vh-assets-title{font-size:11px;font-weight:950;letter-spacing:.075em;text-transform:uppercase;color:#e4b53f;margin:10px 0 6px}
  #valueHistory .vh-trade-assets{display:grid;gap:0;margin:0 0 14px;padding:8px 11px;border:1px solid color-mix(in srgb,#e4b53f 42%,var(--line));border-radius:10px;background:color-mix(in srgb,#e4b53f 5%,var(--card))}
  #valueHistory .vh-trade-asset{font-size:14px;font-weight:760;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--line) 72%,transparent);line-height:1.35}
  #valueHistory .vh-trade-asset:first-child{border-top:0}
  #valueHistory .vh-trade-asset b{font-size:14px}
  #valueHistory .vh-trade-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  #valueHistory .vh-trade-values>div{border-top:1px solid var(--line);padding-top:6px;text-align:center}
  #valueHistory .vh-trade-values small{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em}
  #valueHistory .vh-trade-values b{display:block;margin-top:2px}
  #valueHistory .vh-trade-note{margin-top:10px;color:var(--muted);font-size:10px;line-height:1.4}
  #valueHistory .vh-history-section{border:1px solid color-mix(in srgb,#e4b53f 24%,var(--line));background:color-mix(in srgb,var(--card) 96%,#090b10)}
  #valueHistory .vh-breakdown-sides{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  #valueHistory .vh-breakdown-side{border:1px solid var(--line);border-radius:12px;padding:13px;min-width:0;background:color-mix(in srgb,var(--card) 97%,black)}
  #valueHistory .vh-breakdown-side>h4{margin:0 0 3px;font-size:15px}
  #valueHistory .vh-breakdown-side>.vh-sub{margin-bottom:12px}
  #valueHistory .vh-time-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #valueHistory .vh-time-column{min-width:0}
  #valueHistory .vh-time-label{font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#e4b53f;padding-bottom:6px;border-bottom:1px solid color-mix(in srgb,#e4b53f 30%,var(--line));margin-bottom:3px;text-align:center}
  #valueHistory .vh-trade-asset small{display:block;color:var(--muted);font-size:10px;font-weight:650;margin-top:3px;letter-spacing:.01em}
  #valueHistory .vh-trade-summary3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}
  #valueHistory .vh-trade-summary3>div{border:1px solid var(--line);border-radius:9px;padding:8px;text-align:center}
  #valueHistory .vh-trade-summary3 small{display:block;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
  #valueHistory .vh-trade-summary3 b{display:block;font-size:16px;margin-top:3px}
  #valueHistory .vh-eval-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px}
  #valueHistory .vh-eval-score{font-size:28px;font-weight:950;line-height:1;text-align:right;white-space:nowrap}
  #valueHistory .vh-eval-score span{font-size:13px;color:var(--muted);font-weight:800}
  #valueHistory .vh-eval-score small{display:block;font-size:10px;color:#e4b53f;text-transform:uppercase;letter-spacing:.07em;margin-top:5px}
  #valueHistory .vh-eval-scale{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;margin:10px 0 14px}
  #valueHistory .vh-eval-scale>span{font-size:10px;font-weight:900;color:var(--muted);font-variant-numeric:tabular-nums}
  #valueHistory .vh-eval-scorebar{height:12px;border:2px solid color-mix(in srgb,#e4b53f 70%,#f5f5f5);border-radius:999px;padding:2px;background:#090b10;box-shadow:inset 0 0 0 1px rgba(0,0,0,.65),0 0 0 1px rgba(228,181,63,.15);overflow:hidden;margin:0}
  #valueHistory .vh-eval-scorebar>i{display:block;height:100%;border-radius:999px;background:#e4b53f!important;box-shadow:0 0 8px rgba(228,181,63,.42)}
  #valueHistory .vh-eval-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  #valueHistory .vh-eval-side{border:1px solid var(--line);border-radius:11px;padding:12px;background:color-mix(in srgb,var(--card) 97%,black);min-width:0}
  #valueHistory .vh-eval-side-title{font-size:11px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;color:#e4b53f;margin-bottom:8px}
  #valueHistory .vh-eval-asset{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--line) 72%,transparent)}
  #valueHistory .vh-eval-asset:first-of-type{border-top:0}
  #valueHistory .vh-eval-asset small{display:block;color:var(--muted);margin-top:2px}
  #valueHistory .vh-eval-asset>strong{font-variant-numeric:tabular-nums}
  #valueHistory .vh-eval-totals{display:grid;gap:5px;margin-top:10px;padding-top:9px;border-top:1px solid color-mix(in srgb,#e4b53f 35%,var(--line))}
  #valueHistory .vh-eval-total{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11px}
  #valueHistory .vh-eval-total span{color:var(--muted);font-weight:800;letter-spacing:.04em;text-transform:uppercase}
  #valueHistory .vh-eval-total b{font-size:14px;font-variant-numeric:tabular-nums}
  #valueHistory .vh-eval-total.adjust b{color:#e4b53f}
  #valueHistory .vh-eval-total.effective{padding-top:5px;border-top:1px solid var(--line)}
  #valueHistory .vh-eval-total.effective span,#valueHistory .vh-eval-total.effective b{color:#f4f4f5}
  #valueHistory .vh-hindsight{margin-bottom:16px;padding:13px;border:1px solid color-mix(in srgb,#e4b53f 38%,var(--line));border-radius:12px;background:color-mix(in srgb,#e4b53f 4%,var(--card))}
  #valueHistory .vh-hindsight-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:8px}
  #valueHistory .vh-hindsight-head h4{margin:0;color:#e4b53f;font-size:16px;letter-spacing:.02em}
  #valueHistory .vh-hindsight-head .vh-sub{margin-top:3px}
  #valueHistory .vh-hindsight-score{font-size:23px;font-weight:950;line-height:1;white-space:nowrap;text-align:right}
  #valueHistory .vh-hindsight-score span{font-size:11px;color:var(--muted);font-weight:800}
  #valueHistory .vh-hindsight-score small{display:block;margin-top:4px;color:#e4b53f;font-size:9px;text-transform:uppercase;letter-spacing:.07em}
  #valueHistory .vh-history-compare-title{margin:3px 0 9px;color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.075em;text-transform:uppercase;text-align:center}
  #valueHistory .vh-result-board{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:stretch;margin:10px 0 12px}
  #valueHistory .vh-result-team{border:1px solid var(--line);border-radius:11px;padding:11px 13px;background:color-mix(in srgb,var(--card) 96%,black);min-width:0}
  #valueHistory .vh-result-team.winner{border-color:#e4b53f;background:color-mix(in srgb,#e4b53f 8%,var(--card));box-shadow:inset 0 0 0 1px color-mix(in srgb,#e4b53f 28%,transparent)}
  #valueHistory .vh-result-team small{display:block;color:var(--muted);font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
  #valueHistory .vh-result-team strong{display:block;margin-top:4px;font-size:27px;line-height:1;font-weight:950;color:#f4f4f5}
  #valueHistory .vh-result-team.winner strong{color:#e4b53f}
  #valueHistory .vh-result-team b{display:block;margin-top:6px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #valueHistory .vh-result-vs{display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:92px;color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;text-align:center}
  #valueHistory .vh-result-vs strong{display:block;color:#f4f4f5;font-size:16px;margin-top:3px}
  #valueHistory .vh-result-vs em{font-style:normal;color:#e4b53f;font-size:9px;margin-top:3px}
  #valueHistory .vh-detail-caption{font-size:9px;font-weight:900;letter-spacing:.075em;text-transform:uppercase;color:var(--muted);text-align:center;margin:10px 0 6px}
  @media(max-width:700px){#valueHistory .vh-result-board{grid-template-columns:1fr}.vh-result-vs{min-width:0!important;padding:2px 0}}
  @media(max-width:900px){#valueHistory .vh-attribution-summary{grid-template-columns:1fr}#valueHistory .vh-trade-sides,#valueHistory .vh-breakdown-sides,#valueHistory .vh-eval-grid{grid-template-columns:1fr}}
  @media(max-width:900px){#valueHistory .vh-net-metrics{grid-template-columns:1fr}#valueHistory .vh-team-neighbor-list{grid-template-columns:1fr 1fr}#valueHistory .vh-team-neighbor.current{grid-column:1/-1}}
  #valueHistory .vh-table-wrap{overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:12px}
  #valueHistory .vh-table{width:100%;border-collapse:collapse;font-size:12px}
  #valueHistory .vh-table th,#valueHistory .vh-table td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
  #valueHistory .vh-table th:first-child,#valueHistory .vh-table td:first-child{text-align:left;position:sticky;left:0;background:var(--card)}
  #valueHistory .vh-table th{position:sticky;top:0;background:var(--card);z-index:2;cursor:pointer}
  #valueHistory .vh-table th:first-child{z-index:3}
  #valueHistory details.vh-market-table summary{cursor:pointer;font-weight:700}
  #valueHistory .vh-search-results{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 0}
  #valueHistory .vh-empty{padding:18px;text-align:center;color:var(--muted)}
  #valueHistory .vh-brand-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:2px}
  #valueHistory .vh-brand-title{margin:0!important;color:#f4f4f5;font-size:26px!important;font-weight:850;letter-spacing:-.02em;line-height:1.1}
  #valueHistory .vh-brand-copy{max-width:610px;margin:0 0 2px!important;color:var(--muted);font-size:10px!important;line-height:1.35;text-align:right;opacity:.9}
  @media(max-width:900px){#valueHistory .vh-control-row{align-items:flex-start}#valueHistory .vh-status{text-align:left;white-space:normal;width:100%}#valueHistory .vh-brand-copy{text-align:left;max-width:none;width:100%}#valueHistory .vh-grid,#valueHistory .vh-grid-2,#valueHistory .vh-similar-grid{grid-template-columns:1fr}#valueHistory .vh-metrics{grid-template-columns:repeat(3,1fr)}#valueHistory .vh-profile-info{grid-template-columns:1fr 1fr}#valueHistory .vh-profile-facts{grid-template-columns:repeat(2,1fr)}#valueHistory .vh-current{grid-column:2;grid-row:1;text-align:right}}
  @media(max-width:620px){#valueHistory .vh-metrics{grid-template-columns:repeat(2,1fr)}#valueHistory .vh-rank-grid{grid-template-columns:1fr}#valueHistory .vh-profile-info{grid-template-columns:1fr}#valueHistory .vh-profile-facts{grid-template-columns:repeat(2,1fr)}#valueHistory .vh-current{grid-column:auto;grid-row:auto;text-align:left;border-left:0;border-top:1px solid var(--line);padding:12px 0 0}}
  `;
  st.textContent=st.textContent.replaceAll('#valueHistory',':is(#valueHistory,#tradeHistory)');
  document.head.appendChild(st);
}
function addShell(){
  if(installed)return;installed=true;addStyles();
  const tabs=document.querySelector('.tabs');if(!tabs)return;
  const valueBtn=document.createElement('button');valueBtn.type='button';valueBtn.dataset.tab='valueHistory';valueBtn.textContent='Value History';
  const tradeBtn=document.createElement('button');tradeBtn.type='button';tradeBtn.dataset.tab='tradeHistory';tradeBtn.textContent='Trade History';
  tabs.appendChild(valueBtn);tabs.appendChild(tradeBtn);
  const main=document.querySelector('main');if(!main)return;
  const sec=document.createElement('section');sec.id='valueHistory';sec.className='tab';sec.hidden=true;
  sec.innerHTML='<div class="card"><div class="vh-shell"><div class="vh-brand-head"><h2 class="vh-brand-title">Value History</h2><p class="vh-brand-copy">Historical intelligence for the finished Fleeced! master value. Read-only: this data never feeds back into values, rankings, Trade Finder or Trade Evaluator.</p></div><div id="vhLazy"><div class="empty">Open Value History to load the market dashboard.</div></div></div></div>';
  const tradeSec=document.createElement('section');tradeSec.id='tradeHistory';tradeSec.className='tab';tradeSec.hidden=true;
  tradeSec.innerHTML='<div class="card"><div class="vh-shell"><div class="vh-brand-head"><h2 class="vh-brand-title">Trade History</h2><p class="vh-brand-copy">Completed Sleeper trades with historical value presentation and a read-only analysis from the current Trade Evaluator logic.</p></div><div id="tradeHistoryContent"><div class="empty">Open Trade History to load completed trades.</div></div></div></div>';
  main.appendChild(sec);main.appendChild(tradeSec);
  const activate=(button,id)=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));button.classList.add('active');document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==id)};
  valueBtn.addEventListener('click',()=>{activate(valueBtn,'valueHistory');setTimeout(initUI,0)});
  tradeBtn.addEventListener('click',()=>{activate(tradeBtn,'tradeHistory');setTimeout(initTradeHistoryUI,0)});
  tradeSec.addEventListener('change',handleContentChange);
  tradeSec.addEventListener('click',handleContentClick);
}
function ranked(){try{return typeof ensureMaster==='function'?(ensureMaster()||[]):[]}catch{return[]}}
function posRanks(list){const counts={},map=new Map();for(const z of list){const p=groupPos(z.x);counts[p]=(counts[p]||0)+1;map.set(String(z.x.id),counts[p])}return map}
function currentRows(){const list=ranked();if(!list.length||!tv().playerValue)return[];const pr=posRanks(list),rows=[];for(let i=0;i<list.length;i++){const x=list[i]?.x;if(!x||x.type!=='player')continue;const pos=groupPos(x);if(!['QB','RB','WR','TE','IDP'].includes(pos))continue;const value=Math.round(Number(tv().playerValue(x)||0));if(!Number.isFinite(value)||value<=0)continue;rows.push({id:String(x.id),value,overall:i+1,pos,posRank:pr.get(String(x.id))||1})}return rows}
function currentPickRows(){
  const canonical=window.tradeValueNormalizationV130?.canonicalValue;
  if(typeof canonical!=='function')return[];
  const out=[];
  for(const a of state.allAssets||[]){
    if(a?.type!=='pick')continue;
    const season=Number(a.season),round=Number(a.round),original=Number(a.original_owner)||Number(String(a.id||'').match(/^pick-\d+-\d+-(\d+)$/)?.[1])||0,value=Math.round(Number(canonical(a))||0);
    if(!season||!round||!original||!(value>0))continue;
    out.push({id:String(a.id||`pick-${season}-${round}-${original}`),value,season,round,original_owner:original,owner:Number(a.owner)||0});
  }
  out.sort((a,b)=>a.id.localeCompare(b.id));return out;
}
function currentTeamRows(playerRows=currentRows()){
  const valueById=new Map((playerRows||[]).map(r=>[String(r.id),Number(r.value)||0])),totals=new Map();
  for(const t of state.teams||[])totals.set(String(t.id),{id:String(t.id),value:0,player_count:0});
  for(const a of state.allAssets||[]){
    if(a?.type!=='player')continue;
    const owner=String(a.owner||''),bucket=totals.get(owner),value=valueById.get(String(a.id));
    if(!bucket||!Number.isFinite(value))continue;
    bucket.value+=value;bucket.player_count++;
  }
  return[...totals.values()].map(t=>({...t,value:Math.round(t.value)})).sort((a,b)=>a.id.localeCompare(b.id));
}
function hasValidatedKtcSnapshot(){for(const [name,src] of Object.entries(state?.rankings||{})){const label=`${name} ${src?.source||''}`.toLowerCase();if(!/ktc|keeptradecut/.test(label))continue;const count=Number(src?.playerCount)||Object.keys(src?.data||{}).length;if(count>=300)return true}return false}
function snapshotPreconditions(){if(!window.state||!state.players||Object.keys(state.players).length<100)return false;const text=String(document.getElementById('updateStatus')?.textContent||'').toLowerCase();return !/loading|updating|refreshing/.test(text)}
async function recordSnapshot(){
  try{
    if(!snapshotPreconditions()){scheduleSnapshot(2000);return false}
    const rows=currentRows();
    if(rows.length<100){scheduleSnapshot(2000);return false}
    let picks=[],teams=[];
    try{picks=currentPickRows()}catch(e){console.warn('value-history-pick-enrichment',e)}
    try{teams=currentTeamRows(rows)}catch(e){console.warn('value-history-team-enrichment',e)}
    const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({league:'1316867686394769408',rows,picks,teams})});
    if(r.ok){
      marketCache=null;teamNetCache.clear();
      if(uiReady){
        if(currentView==='market')loadMarket(true);
        else if(currentView==='team'&&trackedTeamId)loadTrackedTeam();
        else if(currentView==='player'&&currentPlayerId)loadPlayer(currentPlayerId);
      }
      return true
    }
    scheduleSnapshot(3000);return false
  }catch(e){
    console.warn('value-history-player-snapshot',e);
    scheduleSnapshot(3000);return false
  }
}
function scheduleSnapshot(delay=60000){clearTimeout(snapshotTimer);snapshotTimer=setTimeout(()=>{if('requestIdleCallback'in window)requestIdleCallback(recordSnapshot,{timeout:5000});else recordSnapshot()},delay)}

function initUI(){
  if(uiReady)return;uiReady=true;
  const root=document.getElementById('vhLazy');if(!root)return;
  root.innerHTML=`<div class="vh-control-row"><div class="vh-subnav"><button type="button" class="secondary small" data-vh-dashboard>Market dashboard</button><button type="button" class="secondary small" data-vh-track-team>Track my team</button></div><div class="vh-status" id="vhStatus">Loading market history…</div></div><div class="vh-hero"><div class="vh-search-wrap"><label for="vhSearch"><b>Search player history</b></label><input id="vhSearch" type="search" placeholder="Search a player…" autocomplete="off"><div id="vhResults" class="vh-search-results"></div></div></div><div id="vhContent"><div class="vh-empty">Loading market dashboard…</div></div>`;
  const input=document.getElementById('vhSearch'),results=document.getElementById('vhResults');
  input.addEventListener('input',()=>renderSearchResults(input.value));
  results.addEventListener('click',e=>{const b=e.target.closest('button[data-vh-id]');if(!b)return;selectPlayer(b.dataset.vhId)});
  root.addEventListener('click',handleContentClick);root.addEventListener('change',handleContentChange);
  const content=document.getElementById('vhContent');content?.addEventListener('pointermove',handleChartPointer);content?.addEventListener('pointerleave',hideChartTooltip);content?.addEventListener('pointerdown',handleChartPointer);
  syncSubnav();loadMarket();
}
function syncSubnav(){
  document.querySelectorAll('#valueHistory .vh-subnav button').forEach(b=>b.classList.remove('vh-subnav-active'));
  const selector=currentView==='team'?'#valueHistory [data-vh-track-team]':'#valueHistory [data-vh-dashboard]';
  document.querySelector(selector)?.classList.add('vh-subnav-active');
}
function renderSearchResults(value){
  const results=document.getElementById('vhResults');if(!results)return;
  const q=norm(value);if(!q){results.innerHTML='';return}
  const matches=ranked().filter(z=>z?.x?.type==='player'&&norm(playerName(z.x.id)).includes(q)).slice(0,16);
  results.innerHTML=matches.map(z=>`<button type="button" class="secondary small" data-vh-id="${esc(z.x.id)}">${esc(playerName(z.x.id))} • ${esc(groupPos(z.x))}</button>`).join('');
}
function syncPlayerSearchState(){
  const wrap=document.querySelector('#valueHistory .vh-search-wrap'),label=wrap?.querySelector('label b');
  if(wrap)wrap.classList.toggle('vh-player-selected',currentView==='player'&&!!currentPlayerId);
  if(label)label.textContent=currentView==='player'&&currentPlayerId?'Selected player':'Search player history';
}
function selectPlayer(id){
  currentView='player';syncSubnav();currentPlayerId=String(id);const input=document.getElementById('vhSearch'),results=document.getElementById('vhResults');
  if(input)input.value=playerName(id);if(results)results.innerHTML='';syncPlayerSearchState();
  loadPlayer(id);
}
function handleContentClick(e){
  const tradeToggle=e.target.closest('[data-vh-trade-toggle]');
  if(tradeToggle){
    const id=String(tradeToggle.dataset.vhTradeId||''),section=String(tradeToggle.dataset.vhTradeToggle||'');
    if(id&&section){
      const state=tradeDetailState.get(id)||{hindsight:false,original:false};
      state[section]=!state[section];tradeDetailState.set(id,state);renderTradeHistory();
    }
    return;
  }
  const player=e.target.closest('[data-vh-player]');if(player){selectPlayer(player.dataset.vhPlayer);return}
  const back=e.target.closest('[data-vh-dashboard]');if(back){currentView='market';syncSubnav();currentPlayerId=null;trackedTeamId=null;const input=document.getElementById('vhSearch');if(input)input.value='';syncPlayerSearchState();loadMarket(true);return}
  const track=e.target.closest('[data-vh-track-team]');if(track){currentView='team';syncSubnav();currentPlayerId=null;syncPlayerSearchState();renderTrackMyTeam();return}
  const openTrades=e.target.closest('[data-vh-open-trade-history]');if(openTrades){openTradeHistoryTab(openTrades.dataset.vhTradeTeam||'');return}
  const teamNetSortBtn=e.target.closest('[data-vh-team-net-sort]');if(teamNetSortBtn){const key=teamNetSortBtn.dataset.vhTeamNetSort;if(teamNetSort.key===key)teamNetSort.dir*=-1;else teamNetSort={key,dir:key==='name'?1:-1};openTeamNetModal();return}
  const attr=e.target.closest('[data-vh-team-attribution]');if(attr&&trackedTeamId){teamAttributionPeriod=attr.dataset.vhTeamAttribution;const ids=(state.allAssets||[]).filter(a=>a?.type==='player'&&String(a.owner)===String(trackedTeamId)).map(a=>String(a.id)).sort(),key=teamNetCacheKey(ids,trackedTeamId);renderTrackedTeamTable(teamNetCache.get(key)||{points:[],player_count:ids.length});return}
  const period=e.target.closest('[data-vh-period]');if(period&&currentPlayerId){const box=document.getElementById('vhProfileData');const pts=box?JSON.parse(box.dataset.points||'[]'):[];renderPlayerProfile(currentPlayerId,pts,period.dataset.vhPeriod);return}
  const mp=e.target.closest('[data-vh-market-period]');if(mp&&marketCache){marketPeriods[mp.dataset.vhCategory]=mp.dataset.vhMarketPeriod;renderMarketDashboard();return}
  const tp=e.target.closest('[data-vh-team-period]');if(tp&&marketCache){teamPeriods[tp.dataset.vhCategory]=tp.dataset.vhTeamPeriod;loadTrackedTeam();return}
  const mr=e.target.closest('[data-vh-market-pool]');if(mr&&marketCache){marketPools[mr.dataset.vhCategory]=mr.dataset.vhMarketPool;renderMarketDashboard();return}
  const tr=e.target.closest('[data-vh-team-pool]');if(tr&&marketCache){teamPools[tr.dataset.vhCategory]=tr.dataset.vhTeamPool;loadTrackedTeam();return}
  const viewAll=e.target.closest('[data-vh-view-all]');if(viewAll&&marketCache){openMoverModal(viewAll.dataset.vhViewAll,viewAll.dataset.vhCategory,viewAll.dataset.vhPeriod,viewAll.dataset.vhScope||'market');return}
  const allNet=e.target.closest('[data-vh-team-net-all]');if(allNet){openTeamNetModal();return}
  const close=e.target.closest('[data-vh-modal-close]');if(close){closeMoverModal();return}
  const sort=e.target.closest('[data-vh-sort]');if(sort&&marketCache){const key=sort.dataset.vhSort;if(marketSort.key===key)marketSort.dir*=-1;else marketSort={key,dir:key==='name'?1:-1};if(currentView==='team'){const ids=(state.allAssets||[]).filter(a=>a?.type==='player'&&String(a.owner)===String(trackedTeamId)).map(a=>String(a.id)).sort(),key=teamNetCacheKey(ids,trackedTeamId);renderTrackedTeamTable(teamNetCache.get(key)||{points:[],player_count:ids.length})}else renderMarketTable();return}
}
function handleContentChange(e){
  const team=e.target.closest?.('[data-vh-team-select]');if(team){trackedTeamId=team.value;loadTrackedTeam();return}
  const tradeTeam=e.target.closest?.('[data-vh-trade-team]');if(tradeTeam){tradeTeamFilter=tradeTeam.value;renderTradeHistory();return}
}
function hideChartTooltip(){document.querySelectorAll('#valueHistory .vh-chart-tooltip').forEach(tip=>tip.style.display='none')}
function handleChartPointer(e){
  const hit=e.target?.closest?.('.vh-point-hit,.vh-rank-hit,.vh-net-hit'),wrap=hit?.closest?.('.vh-value-chart,.vh-rank-chart,.vh-net-chart'),tip=wrap?.querySelector?.('.vh-chart-tooltip');
  if(!hit||!wrap||!tip){if(e.type==='pointermove')hideChartTooltip();return}
  const rect=wrap.getBoundingClientRect(),x=Math.max(8,Math.min(rect.width-210,e.clientX-rect.left)),y=Math.max(20,Math.min(rect.height-20,e.clientY-rect.top));
  if(hit.classList.contains('vh-net-hit')){
    let linked=null;try{linked=hit.dataset.vhTrades?JSON.parse(hit.dataset.vhTrades):null}catch{}
    const trades=Array.isArray(linked?.events)?linked.events:[];
    const tradeMarkup=trades.length?`<div class="vh-tooltip-trades"><small>Completed trade${trades.length===1?'':'s'} linked to this team snapshot</small>${trades.map(t=>`<div class="vh-tooltip-trade"><b>${esc(t.date)}</b> • vs. ${esc(t.counterparts)}</div>`).join('')}<div class="${deltaClass(linked.change)}">Observed team net-value change from prior authoritative snapshot: <strong>${signed(linked.change)}</strong></div><small>This is observed movement between snapshots, not an assumption that the trade alone caused the change.</small></div>`:''; 
    tip.innerHTML=`<b>${esc(hit.dataset.vhDate)}</b><div>Overall Net Value <strong>${esc(hit.dataset.vhNetValue)}</strong></div>${tradeMarkup}`;
  }
  else if(hit.classList.contains('vh-rank-hit'))tip.innerHTML=`<b>${esc(hit.dataset.vhDate)}</b><div>${esc(hit.dataset.vhRankLabel)} <strong>#${esc(hit.dataset.vhRank)}</strong></div>`;
  else tip.innerHTML=`<b>${esc(hit.dataset.vhDate)}</b><div>Value <strong>${esc(hit.dataset.vhValue)}</strong></div><div>Overall #${esc(hit.dataset.vhOverall)} • ${esc(hit.dataset.vhPos)} #${esc(hit.dataset.vhPosRank)}</div>`;
  tip.style.left=`${x}px`;tip.style.top=`${y}px`;tip.style.display='block';
}
async function tradeHistoryFetch(){
  if(tradeHistoryCache)return tradeHistoryCache;
  const r=await fetch(`${API}?trades=1`,{cache:'no-store'});if(!r.ok)throw Error('trade history unavailable');
  tradeHistoryCache=await r.json();return tradeHistoryCache;
}
function historicalTradeTeamName(trade,id){return String(trade?.team_names?.[String(id)]||teamName(id))}
function tradePickAsset(p,receiver){
  const original=Number(p?.original_roster_id)||0,season=Number(p?.season)||0,round=Number(p?.round)||0;
  if(!season||!round||!original)return null;
  return{type:'pick',id:`pick-${season}-${round}-${original}`,season,round,owner:Number(receiver)||0,original_owner:original,name:`${season} R${round}`,source:'sleeper-history',historyPick:{drafted_player_id:p?.drafted_player_id||null,draft_slot:p?.draft_slot||null,pick_no:p?.pick_no||null,draft_id:p?.draft_id||null}};
}
function tradePlayerAsset(id,receiver){return{type:'player',id:String(id),owner:Number(receiver)||0,name:playerName(id)}}
function currentEvaluatorValue(asset){
  if(!asset)return null;
  try{
    const canonical=window.tradeValueNormalizationV130?.canonicalValue;
    if(typeof canonical==='function'){const n=Number(canonical(asset));return Number.isFinite(n)?Math.round(n):null}
    if(typeof window.tradeAssetValue93==='function'){const n=Number(window.tradeAssetValue93(asset));return Number.isFinite(n)?Math.round(n):null}
    return null;
  }catch{return null}
}
function tradeHistoryNearestDraftYear(trade){
  const season=Number(trade?.season)||new Date(trade?.created||0).getFullYear();
  return Number.isFinite(season)&&season>2000?season+1:null;
}
function activeNearestDraftYear(){
  const n=Number(window.tradeValueNormalizationV130?.nearestSeason?.());
  if(Number.isFinite(n)&&n>2000)return n;
  const years=(state.allAssets||[]).filter(a=>a?.type==='pick').map(a=>Number(a.season)).filter(Number.isFinite);
  return years.length?Math.min(...years):null;
}
function tradeHistoryPickTimingFactor(year,round,nearestYear){
  const y=Number(year),r=Number(round),base=Number(nearestYear);
  if(!Number.isFinite(y)||!Number.isFinite(base))return 1;
  const discount=Math.pow(.88,Math.max(0,y-base));
  const special2027=(y===2027&&r===1)?1.03:1;
  return discount*special2027;
}
function retroactiveTradeHistoryPickValue(asset,trade){
  if(!asset||asset.type!=='pick')return currentEvaluatorValue(asset);
  const recorded=Number(asset.historyRecordedValue);if(Number.isFinite(recorded)&&recorded>0)return Math.round(recorded);
  const live=currentEvaluatorValue(asset),currentBase=activeNearestDraftYear(),historicalBase=tradeHistoryNearestDraftYear(trade);
  if(live==null||!currentBase||!historicalBase)return live;
  const currentFactor=tradeHistoryPickTimingFactor(asset.season,asset.round,currentBase),historicalFactor=tradeHistoryPickTimingFactor(asset.season,asset.round,historicalBase);
  if(!(currentFactor>0))return live;
  return Math.max(0,Math.round((live*historicalFactor/currentFactor)/5)*5);
}
function tradeHistoryEvaluatorValue(asset,trade){
  if(!asset)return null;
  const side=(trade?.sides||[]).find(s=>Number(s?.roster_id)===Number(asset?.owner));
  if(asset.type==='pick'){
    const recorded=Number(asset.historyRecordedValue);
    if(Number.isFinite(recorded)&&recorded>0)return Math.round(recorded);
    return retroactiveTradeHistoryPickValue(asset,trade);
  }
  const historical=side?historicalPlayerValue(side,asset.id):null;
  return historical==null?null:historical;
}
function fairWithValue(give,recv,valueFn){
  const clamp=(a,x,b)=>Math.max(a,Math.min(x,b)),av=x=>Math.max(0,Number(valueFn(x))||0),raw=xs=>(xs||[]).reduce((n,x)=>n+av(x),0),rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
  const ar=raw(give),br=raw(recv),aTop=(give||[]).slice().sort((x,y)=>av(y)-av(x))[0]||null,bTop=(recv||[]).slice().sort((x,y)=>av(y)-av(x))[0]||null,am=aTop?av(aTop):0,bm=bTop?av(bTop):0;let aa=0,ba=0;
  const amp=asset=>{if(!asset||asset.type!=='player')return 1.10;const r=Math.max(1,rankOf(asset));return 1.10+.44*Math.exp(-(r-1)/35)};
  const eliteWeight=asset=>asset?.type==='player'?Math.exp(-(Math.max(1,rankOf(asset))-1)/28):0;
  const counterElitePressure=xs=>{const strengths=(xs||[]).filter(x=>x?.type==='player'&&(rankOf(x)<=20||av(x)>=8000)).map(x=>{const r=Math.max(1,rankOf(x)),v=av(x),rankStrength=clamp(0,(21-r)/20,1),valueStrength=clamp(0,(v-7800)/2200,1);return .7*rankStrength+.3*valueStrength});return strengths.length?clamp(0,Math.max(...strengths)+.18*Math.max(0,strengths.length-1),1):0};
  const calc=(premium,otherTop,otherRaw,premiumRaw,asset,otherAssets)=>{if(premium<=otherTop||otherTop<=0)return 0;const depth=Math.max(0,otherRaw-otherTop);if(depth<=0)return 0;const rel=clamp(0,otherTop/premium,1),strength=premium/(premium+3500),rate=.075+.18*strength,counter=1-.75*Math.pow(rel,1.4),disp=1+.8*(1-rel),elite=1.3+1.5*clamp(0,(premium-5000)/5000,1),smooth=1+.39*clamp(0,(8800-premium)/1890,1),legacy=premium*rate*counter*disp*elite*smooth*amp(asset),rawGap=Math.max(0,otherRaw-premiumRaw),ew=eliteWeight(asset),gapTarget=rawGap>0?rawGap*(.50+.50*ew):0,depthCap=depth*(.55+(rawGap>0?.35*ew:0)),elitePressure=rawGap>0?counterElitePressure(otherAssets):0,eliteCounterCap=elitePressure>0?rawGap*(1-.72*elitePressure):Infinity,proximityRate=clamp(.18,.18+2.35*(1-rel),1),centerpieceProximityCap=rawGap>0?rawGap*proximityRate:Infinity;return Math.min(Math.max(legacy,gapTarget),depthCap,eliteCounterCap,centerpieceProximityCap)};
  if(am>bm)aa=calc(am,bm,br,ar,aTop,recv);else if(bm>am)ba=calc(bm,am,ar,br,bTop,give);
  const a=ar+aa,b=br+ba,hi=Math.max(a,b,1),rel=Math.abs(a-b)/hi,m=145+45*clamp(0,(hi-4000)/7000,1),score=Math.round(clamp(1,100-rel*m,100)),ratio=Math.min(a,b)/hi;
  return{aRaw:ar,bRaw:br,aAdj:aa,bAdj:ba,aEffective:a,bEffective:b,edgeRaw:b?br-ar:0,edgeEffective:b-a,ratio,score,rejected:score<55||ratio<.62,status:score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable'};
}
function tradeHistoryFair(give,recv,trade){return fairWithValue(give,recv,a=>tradeHistoryEvaluatorValue(a,trade))}
function hindsightFair(give,recv,trade){return fairWithValue(give,recv,a=>hindsightValue(a,trade))}
function currentTradePlayerMeta(id){
  const sid=String(id),row=currentRows().find(r=>String(r?.id)===sid),asset=tradePlayerAsset(sid,0),pos=row?.pos||groupPos(asset),team=String(state.players?.[sid]?.team||'FA').toUpperCase(),overall=Number(row?.overall),posRank=Number(row?.posRank);
  return`${pos} • ${team}${Number.isFinite(overall)?` • Overall #${overall}`:''}${Number.isFinite(posRank)?` • ${pos} #${posRank}`:''}`;
}
function historicalPickValue(side,p){
  const id=`pick-${Number(p?.season)||0}-${Number(p?.round)||0}-${Number(p?.original_roster_id)||0}`,row=(side?.then_picks||[]).find(x=>String(x?.id)===id),n=Number(row?.value);
  return Number.isFinite(n)?Math.round(n):null;
}
function historicalPlayerValue(side,id){
  const row=(side?.then_players||[]).find(x=>String(x?.id)===String(id)),n=Number(row?.value);return Number.isFinite(n)?Math.round(n):null
}
function historicalDraftSlotLabel(p){
  const season=Number(p?.season),round=Number(p?.round),slot=Number(p?.draft_slot);
  if(!Number.isFinite(season)||!Number.isFinite(round)||!Number.isFinite(slot)||slot<1)return null;
  return`${season} ${round}.${String(slot).padStart(2,'0')}`
}
function historicalPickOwnershipLabel(p,trade){
  const original=p?.original_roster_id?historicalTradeTeamName(trade,p.original_roster_id):'Unknown original team';
  return `Original pick: ${original}`
}
function tradePickLabel(p,trade){
  const original=p.original_roster_id?historicalTradeTeamName(trade,p.original_roster_id):'Unknown original team';
  const slotLabel=historicalDraftSlotLabel(p),used=p.drafted_player_id?` → selected ${esc(playerName(p.drafted_player_id))}${slotLabel?` at ${esc(slotLabel)}`:''}`:'';
  return`${esc(p.season)} Round ${esc(p.round)} • original: ${esc(original)}${used}`;
}
function sideValueModel(side,trade){
  const atTradeItems=[],currentItems=[];let atTradeComplete=true,currentComplete=true;
  for(const id of side.player_ids||[]){
    const hist=historicalPlayerValue(side,id),asset=tradePlayerAsset(id,side.roster_id),now=currentEvaluatorValue(asset);
    if(hist==null)atTradeComplete=false;if(now==null)currentComplete=false;
    atTradeItems.push({label:playerName(id),kind:'player',value:hist});
    currentItems.push({label:playerName(id),kind:'player',value:now});
  }
  for(const p of side.picks||[]){
    const pickAsset=tradePickAsset(p,side.roster_id),recorded=historicalPickValue(side,p),then=recorded??retroactiveTradeHistoryPickValue(pickAsset,trade);
    if(then==null)atTradeComplete=false;
    const ownership=historicalPickOwnershipLabel(p,trade),slotLabel=historicalDraftSlotLabel(p);
    atTradeItems.push({label:`Draft pick: ${p.season} R${p.round}`,meta:ownership,kind:'pick',value:then});
    if(p.drafted_player_id){
      const drafted=tradePlayerAsset(p.drafted_player_id,side.roster_id),now=currentEvaluatorValue(drafted);if(now==null)currentComplete=false;
      currentItems.push({label:playerName(p.drafted_player_id),meta:`From ${slotLabel||`${p.season} R${p.round}`} • ${ownership}`,kind:'drafted-player',value:now});
    }else{
      const now=currentEvaluatorValue(pickAsset);if(now==null)currentComplete=false;
      currentItems.push({label:`Draft pick: ${p.season} R${p.round}`,meta:ownership,kind:'pick',value:now});
    }
  }
  const sum=items=>items.reduce((n,x)=>n+(Number(x.value)||0),0);
  return{atTradeItems,currentItems,atTradeTotal:atTradeComplete?sum(atTradeItems):null,currentTotal:currentComplete?sum(currentItems):null,atTradeComplete,currentComplete};
}
function tradeOutcomeAssets(side){
  const out=(side.player_ids||[]).map(id=>tradePlayerAsset(id,side.roster_id));
  for(const p of side.picks||[]){if(p.drafted_player_id)out.push(tradePlayerAsset(p.drafted_player_id,side.roster_id));else{const pick=tradePickAsset(p,side.roster_id);if(pick)out.push(pick)}}
  return out;
}
function tradeOriginalAssets(side){
  const out=(side?.player_ids||[]).map(id=>tradePlayerAsset(id,side.roster_id));
  for(const p of side?.picks||[]){const pick=tradePickAsset(p,side.roster_id);if(pick){const recorded=historicalPickValue(side,p);if(recorded!=null)pick.historyRecordedValue=recorded;out.push(pick)}}
  return out;
}
function tradeEvaluatorAnalysis(trade){
  if((trade.roster_ids||[]).length!==2||!Array.isArray(trade.sides)||trade.sides.length!==2)return{available:false,reason:'The current Trade Evaluator supports two-team trades only; no grade is inferred for a multi-team trade.'};
  if(typeof window.tradeValueNormalizationV130?.canonicalValue!=='function')return{available:false,reason:'Current Trade Evaluator value runtime is not available yet.'};
  try{
    const sideA=trade.sides[0],sideB=trade.sides[1],a=Number(sideA.roster_id),b=Number(sideB.roster_id),aReceived=tradeOriginalAssets(sideA),bReceived=tradeOriginalAssets(sideB);
    if(!a||!b)return{available:false,reason:'Sleeper roster IDs are incomplete for this trade.'};
    const missing=[...aReceived,...bReceived].some(x=>tradeHistoryEvaluatorValue(x,trade)==null);
    const histA=historicalTradeTeamName(trade,a),histB=historicalTradeTeamName(trade,b);
    if(missing)return{available:true,incomplete:true,score:null,label:'Historical value unavailable',teamA:a,teamB:b,teamAName:histA,teamBName:histB,aReceived,bReceived,f:null};
    const f=tradeHistoryFair(bReceived,aReceived,trade),score=Math.max(1,Math.min(100,Number(f?.score)||1)),label=f?.rejected?'Fleeced!':String(f?.status||'Trade');
    return{available:true,incomplete:false,score,label,teamA:a,teamB:b,teamAName:histA,teamBName:histB,aReceived,bReceived,f};
  }catch(e){return{available:false,reason:`Current Trade Evaluator could not analyze this historical package: ${String(e?.message||e)}`}}
}
function tradeItemRows(items){
  return items.map(x=>`<div class="vh-driver-row"><div><b>${esc(x.label)}</b>${x.meta?`<small>${esc(x.meta)}</small>`:''}</div><div>${x.value==null?'—':fmt(x.value)}</div></div>`).join('')||'<div class="vh-empty">No assets.</div>'
}
function tradeHindsightAssets(side){
  const out=(side?.player_ids||[]).map(id=>tradePlayerAsset(id,side.roster_id));
  for(const p of side?.picks||[]){
    if(p?.drafted_player_id){
      const a=tradePlayerAsset(p.drafted_player_id,side.roster_id);
      a.hindsightFromPick={season:Number(p.season)||null,round:Number(p.round)||null,original_roster_id:Number(p.original_roster_id)||null,draft_slot:Number(p.draft_slot)||null,pick_no:Number(p.pick_no)||null};
      out.push(a);
    }else{
      const a=tradePickAsset(p,side.roster_id);if(a)out.push(a);
    }
  }
  return out;
}
function completedHistoricalPick(asset){
  const nearest=activeNearestDraftYear(),season=Number(asset?.season);
  return asset?.type==='pick'&&Number.isFinite(nearest)&&Number.isFinite(season)&&season<nearest;
}
function hindsightValue(asset,trade){
  if(!asset)return null;
  if(asset.type==='pick'&&completedHistoricalPick(asset))return retroactiveTradeHistoryPickValue(asset,trade);
  return currentEvaluatorValue(asset);
}
function tradeResultScoreboard(teamA,totalA,teamB,totalB,score,label){
  const a=Number(totalA)||0,b=Number(totalB)||0,edge=Math.abs(a-b),aWin=a>b,bWin=b>a;
  return`<div class="vh-result-board"><div class="vh-result-team ${aWin?'winner':''}"><small>${aWin?'Winner • trade-adjusted total':'Trade-adjusted total'}</small><strong>${fmt(a)}</strong><b>${esc(teamA)}</b></div><div class="vh-result-vs"><span>Adjusted edge</span><strong>${fmt(edge)}</strong><em>${Math.round(Number(score)||0)}/100 • ${esc(label||'Trade')}</em></div><div class="vh-result-team ${bWin?'winner':''}"><small>${bWin?'Winner • trade-adjusted total':'Trade-adjusted total'}</small><strong>${fmt(b)}</strong><b>${esc(teamB)}</b></div></div>`;
}
function hindsightAssetRow(asset,trade){
  const value=hindsightValue(asset,trade),label=asset?.type==='pick'?(asset.name||`${asset.season} R${asset.round}`):playerName(asset?.id);
  let meta='';
  if(asset?.hindsightFromPick){
    const p=asset.hindsightFromPick,original=p.original_roster_id?historicalTradeTeamName(trade,p.original_roster_id):'Unknown original team';
    const slotLabel=historicalDraftSlotLabel(p);
    meta=`${currentTradePlayerMeta(asset.id)} • from ${slotLabel||`${p.season} R${p.round}`} • original: ${original}`;
  }else if(asset?.type==='pick'){
    meta=`Draft pick • original: ${historicalTradeTeamName(trade,asset.original_owner)}`;
  }else meta=currentTradePlayerMeta(asset?.id);
  return`<div class="vh-eval-asset"><div><b>${esc(label)}</b><small>${esc(meta)}</small></div><strong>${value==null?'N/A':fmt(value)}</strong></div>`;
}
function hindsightSide(title,assets,raw,adj,effective,trade){
  return`<div class="vh-eval-side"><div class="vh-eval-side-title">${esc(title)}</div>${assets.map(a=>hindsightAssetRow(a,trade)).join('')||'<div class="vh-empty">No current outcome assets</div>'}<div class="vh-eval-totals"><div class="vh-eval-total"><span>Raw asset total</span><b>${fmt(raw)}</b></div>${Number(adj)>0?`<div class="vh-eval-total adjust"><span>Value adjustment</span><b>+${fmt(adj)}</b></div><div class="vh-eval-total effective"><span>Trade-adjusted total</span><b>${fmt(effective)}</b></div>`:''}</div></div>`;
}
function hindsightAnalysis(trade){
  if((trade?.roster_ids||[]).length!==2||!Array.isArray(trade?.sides)||trade.sides.length!==2)return{available:false,reason:'Hindsight is available for two-team trades.'};
  if(typeof window.tradeValueNormalizationV130?.canonicalValue!=='function')return{available:false,reason:'Current evaluator runtime is not available yet.'};
  try{
    const sideA=trade.sides[0],sideB=trade.sides[1],aAssets=tradeHindsightAssets(sideA),bAssets=tradeHindsightAssets(sideB);
    if([...aAssets,...bAssets].some(x=>hindsightValue(x,trade)==null))return{available:false,reason:'At least one current outcome asset is unavailable to the evaluator.'};
    const f=hindsightFair(bAssets,aAssets,trade),score=Math.max(1,Math.min(100,Number(f?.score)||1)),label=f?.rejected?'Fleeced!':String(f?.status||'Trade');
    return{available:true,score,label,aAssets,bAssets,f,teamAName:historicalTradeTeamName(trade,sideA.roster_id),teamBName:historicalTradeTeamName(trade,sideB.roster_id)};
  }catch(e){return{available:false,reason:'Current outcome could not be evaluated.'}}
}
function hindsightSection(trade){
  const h=hindsightAnalysis(trade);
  if(!h.available)return`<div class="vh-hindsight"><div class="vh-hindsight-head"><div><h4>Hindsight</h4><div class="vh-sub">How the trade's current outcome pieces compare today.</div></div></div><div class="vh-empty">${esc(h.reason)}</div></div>`;
  const f=h.f,edge=Number(f?.edgeEffective)||0;
  return`<div class="vh-hindsight"><div class="vh-hindsight-head"><div><h4>Hindsight</h4><div class="vh-sub">Looking back on trades with today's current value.</div></div></div>${tradeResultScoreboard(h.teamAName,f.bEffective,h.teamBName,f.aEffective,h.score,h.label)}<div class="vh-eval-scale"><span>0</span><div class="vh-eval-scorebar" aria-label="Hindsight score ${Math.round(h.score)} out of 100"><i style="width:${h.score}%"></i></div><span>100</span></div><div class="vh-detail-caption">Current outcome detail</div><div class="vh-eval-grid">${hindsightSide(`${h.teamAName}`,h.aAssets,f.bRaw,f.bAdj,f.bEffective,trade)}${hindsightSide(`${h.teamBName}`,h.bAssets,f.aRaw,f.aAdj,f.aEffective,trade)}</div><div class="vh-trade-summary3"><div><small>Raw difference</small><b>${signed(Number(f.edgeRaw)||0)}</b></div><div><small>Value adjustment</small><b>${Math.max(Number(f.aAdj)||0,Number(f.bAdj)||0)>0?'+'+fmt(Math.max(Number(f.aAdj)||0,Number(f.bAdj)||0)):'0'}</b></div><div><small>Adjusted difference</small><b class="${deltaClass(edge)}">${signed(edge)}</b></div></div></div>`;
}
function tradeValuePresentation(trade){
  return hindsightSection(trade)
}
function historicalValueComparisonSection(trade){
  return`<div class="vh-card vh-history-section"><div class="vh-history-compare-title">Historical value comparison</div><div class="vh-breakdown-sides">${(trade.sides||[]).map(side=>{const m=sideValueModel(side,trade),delta=m.atTradeTotal!=null&&m.currentTotal!=null?m.currentTotal-m.atTradeTotal:null;return`<div class="vh-breakdown-side"><h4>${esc(historicalTradeTeamName(trade,side.roster_id))}</h4><div class="vh-time-columns"><div class="vh-time-column"><div class="vh-time-label">At time of trade</div>${tradeItemRows(m.atTradeItems)}</div><div class="vh-time-column"><div class="vh-time-label">Current outcome</div>${tradeItemRows(m.currentItems)}</div></div><div class="vh-trade-summary3"><div><small>Value at trade</small><b>${m.atTradeTotal==null?'—':fmt(m.atTradeTotal)}</b></div><div><small>Current value</small><b>${m.currentTotal==null?'—':fmt(m.currentTotal)}</b></div><div><small>Change</small><b class="${delta==null?'vh-neutral':deltaClass(delta)}">${delta==null?'—':signed(delta)}</b></div></div>${m.atTradeComplete?'':`<div class="vh-trade-note">Historical player value is unavailable for part of this package because the trade predates reliable stored Value History or a player is missing from that snapshot. No value was guessed.</div>`}</div>`}).join('')}</div></div>`
}

function evaluatorAssetRow(asset,trade){
  const value=tradeHistoryEvaluatorValue(asset,trade),label=asset?.type==='pick'?(asset.name||`${asset.season} R${asset.round}`):playerName(asset?.id);
  let meta='';
  if(asset?.type==='pick'){
    const original=historicalTradeTeamName(trade,asset.original_owner),slotLabel=historicalDraftSlotLabel({season:asset.season,round:asset.round,draft_slot:asset.historyPick?.draft_slot}),used=asset.historyPick?.drafted_player_id?` • selected ${playerName(asset.historyPick.drafted_player_id)}${slotLabel?` at ${slotLabel}`:''}`:'';
    meta=`Draft pick • original: ${original}${used}`;
  }else meta=currentTradePlayerMeta(asset?.id);
  return`<div class="vh-eval-asset"><div><b>${esc(label)}</b><small>${esc(meta)}</small></div><strong>${value==null?'—':fmt(value)}</strong></div>`
}
function evaluatorSide(title,assets,raw,adj,effective,trade){
  return`<div class="vh-eval-side"><div class="vh-eval-side-title">${esc(title)}</div>${assets.map(a=>evaluatorAssetRow(a,trade)).join('')||'<div class="vh-empty">No assets</div>'}<div class="vh-eval-totals"><div class="vh-eval-total"><span>Raw asset total</span><b>${fmt(raw)}</b></div>${Number(adj)>0?`<div class="vh-eval-total adjust"><span>Value adjustment</span><b>+${fmt(adj)}</b></div><div class="vh-eval-total effective"><span>Trade-adjusted total</span><b>${fmt(effective)}</b></div>`:''}</div></div>`
}
function tradeEvaluatorSection(trade){
  const a=tradeEvaluatorAnalysis(trade);
  if(!a.available)return`<div class="vh-card vh-history-section"><div class="vh-card-head"><div><h3>Original Trade Analysis</h3><div class="vh-sub">Current evaluator calculation, read-only.</div></div></div><div class="vh-empty">${esc(a.reason)}</div></div>`;
  if(a.incomplete){
    return`<div class="vh-card vh-history-section"><div class="vh-eval-head"><div><h3>Original Trade Analysis</h3><div class="vh-sub">The original trade package using the historical values available from when the trade occurred. N/A means this trade occurred before reliable Trade History player values were established, so no historical player value is guessed.</div></div></div><div class="vh-result-board"><div class="vh-result-team"><small>Trade-adjusted total</small><strong>N/A</strong><b>${esc(a.teamAName)}</b></div><div class="vh-result-vs"><span>Original result</span><strong>N/A</strong><em>Historical value unavailable</em></div><div class="vh-result-team"><small>Trade-adjusted total</small><strong>N/A</strong><b>${esc(a.teamBName)}</b></div></div><div class="vh-detail-caption">Original trade detail</div><div class="vh-eval-grid">${evaluatorSide(`${a.teamAName}`,a.aReceived,0,0,0,trade)}${evaluatorSide(`${a.teamBName}`,a.bReceived,0,0,0,trade)}</div><div class="vh-trade-note">N/A indicates that the historical player value is unavailable. These trades occurred before Trade History was established, so no historical player value is guessed or replaced with today's value.</div></div>`;
  }
  const f=a.f,edge=Number(f?.edgeEffective)||0;
  return`<div class="vh-card vh-history-section"><div class="vh-eval-head"><div><h3>Original Trade Analysis</h3><div class="vh-sub">The original trade package evaluated with the Trade History valuation context that applied when the trade occurred. Current/future Trade Evaluator and draft-pick logic are not modified.</div></div></div>${tradeResultScoreboard(a.teamAName,f.bEffective,a.teamBName,f.aEffective,a.score,a.label)}<div class="vh-eval-scale"><span>0</span><div class="vh-eval-scorebar" aria-label="Trade Evaluator score ${Math.round(a.score)} out of 100"><i style="width:${a.score}%"></i></div><span>100</span></div><div class="vh-detail-caption">Original trade detail</div><div class="vh-eval-grid">${evaluatorSide(`${a.teamAName}`,a.aReceived,f.bRaw,f.bAdj,f.bEffective,trade)}${evaluatorSide(`${a.teamBName}`,a.bReceived,f.aRaw,f.aAdj,f.aEffective,trade)}</div><div class="vh-trade-summary3"><div><small>Raw difference</small><b>${signed(Number(f.edgeRaw)||0)}</b></div><div><small>Value adjustment</small><b>${Math.max(Number(f.aAdj)||0,Number(f.bAdj)||0)>0?'+'+fmt(Math.max(Number(f.aAdj)||0,Number(f.bAdj)||0)):'0'}</b></div><div><small>Adjusted difference</small><b class="${deltaClass(edge)}">${signed(edge)}</b></div></div></div>`
}
function tradeStateKey(trade){return String(trade?.id||trade?.transaction_id||`${trade?.created||'unknown'}:${(trade?.roster_ids||[]).join('-')}`)}
function compactTradeAssetLabel(p,trade){
  if(p?.player_id||p?.id)return esc(playerName(p.player_id||p.id));
  if(p?.season&&p?.round)return `${esc(p.season)} R${esc(p.round)}`;
  return 'Asset';
}
function compactTradePlayerMeta(id){
  const sid=String(id),asset=tradePlayerAsset(sid,0),pos=groupPos(asset),team=String(state.players?.[sid]?.team||'FA').toUpperCase();
  return`${pos} • ${team}`
}
function compactTradeSide(side,trade){
  const assets=[];
  for(const id of side?.player_ids||[])assets.push(`<span class="vh-compact-asset"><b>${esc(playerName(id))}</b><small>${esc(compactTradePlayerMeta(id))}</small></span>`);
  for(const p of side?.picks||[])assets.push(`<span class="vh-compact-asset"><b>${esc(p.season)} R${esc(p.round)}${p?.drafted_player_id?` → ${esc(playerName(p.drafted_player_id))}`:''}</b></span>`);
  return`<div class="vh-compact-side"><b>${esc(historicalTradeTeamName(trade,side?.roster_id))}</b><div class="vh-compact-assets">${assets.join('')||'<span class="vh-compact-asset">No assets</span>'}</div></div>`
}
function tradeCard(trade){
  const key=tradeStateKey(trade),open=tradeDetailState.get(key)||{hindsight:false,original:false},anyOpen=open.hindsight||open.original;
  const names=(trade.roster_ids||[]).map(id=>esc(historicalTradeTeamName(trade,id))).join(' ↔ ');
  return`<div class="vh-trade-card ${anyOpen?'vh-trade-expanded':'vh-trade-collapsed'}"><div class="vh-trade-head"><div><h4>${esc(dateTime(trade.created))} • ${esc(String(trade.season||''))} Trade</h4><div class="vh-sub">${names}</div></div>${trade.trade_snapshot_t?`<small>Historical snapshot: ${esc(dateTime(trade.trade_snapshot_t))}</small>`:''}</div><div class="vh-compact-trade">${(trade.sides||[]).map(side=>compactTradeSide(side,trade)).join('')}</div><div class="vh-trade-toggle-row"><button type="button" class="${open.hindsight?'vh-trade-toggle-active':'secondary'} small vh-trade-toggle" data-vh-trade-toggle="hindsight" data-vh-trade-id="${esc(key)}" aria-expanded="${open.hindsight?'true':'false'}">Hindsight <span>${open.hindsight?'▴':'▾'}</span></button><button type="button" class="${open.original?'vh-trade-toggle-active':'secondary'} small vh-trade-toggle" data-vh-trade-toggle="original" data-vh-trade-id="${esc(key)}" aria-expanded="${open.original?'true':'false'}">Original Trade Analysis <span>${open.original?'▴':'▾'}</span></button></div>${open.hindsight?tradeValuePresentation(trade):''}${open.original?tradeEvaluatorSection(trade):''}${anyOpen?historicalValueComparisonSection(trade):''}</div>`
}
function initTradeHistoryUI(){if(!tradeHistoryCache)loadTradeHistory();else renderTradeHistory()}
function renderTradeHistory(){
  const box=document.getElementById('tradeHistoryContent');if(!box)return;
  const data=tradeHistoryCache;if(!data?.trades){box.innerHTML='<div class="vh-card"><div class="vh-empty">Loading completed trades…</div></div>';return}
  const ids=leagueTeamIds(),filtered=(data.trades||[]).filter(t=>!tradeTeamFilter||(t.roster_ids||[]).map(String).includes(String(tradeTeamFilter)));
  box.innerHTML=`<div class="vh-card"><div class="vh-card-head"><div><h3>Completed Trade History</h3><div class="vh-sub">Trades open in a compact view showing the teams and assets exchanged. Expand Hindsight and/or Original Trade Analysis only when you want the full detail; Historical Value Comparison appears with either expanded section.</div></div></div><div class="vh-team-toolbar"><label><b>Filter by team</b><select data-vh-trade-team><option value="">All teams</option>${ids.map(id=>`<option value="${esc(id)}" ${String(tradeTeamFilter)===String(id)?'selected':''}>${esc(teamName(id))}</option>`).join('')}</select></label></div><div class="vh-trade-note">Source: ${esc(data.source||'Sleeper transaction history')} • ${filtered.length} completed trade${filtered.length===1?'':'s'} shown. Exact draft-result mapping is displayed only when Sleeper provides an unambiguous draft slot → roster → player chain.</div></div><div class="vh-trade-list">${filtered.map(tradeCard).join('')||'<div class="vh-card"><div class="vh-empty">No completed trades match this filter.</div></div>'}</div>`;
}
async function loadTradeHistory(){
  const box=document.getElementById('tradeHistoryContent');if(!box)return;
  box.innerHTML='<div class="vh-card"><div class="vh-empty">Loading completed trades…</div></div>';
  try{await tradeHistoryFetch();renderTradeHistory()}catch{box.innerHTML='<div class="notice">Completed trade history is temporarily unavailable. Current values, Trade Evaluator, and Trade Finder are unaffected.</div>'}
}
function openTradeHistoryTab(teamId=''){
  if(teamId)tradeTeamFilter=String(teamId);
  const btn=document.querySelector('.tabs button[data-tab="tradeHistory"]');if(!btn)return;
  btn.click();
}
function teamTradeImpactCard(teamId){
  const id=String(teamId),data=tradeHistoryCache,trades=(data?.trades||[]).filter(t=>(t.roster_ids||[]).map(String).includes(id));
  if(!data)return`<div class="vh-card"><div class="vh-card-head"><div><h3>Recent Trade Impact</h3><div class="vh-sub">Completed-trade context is available in the dedicated Trade History tab.</div></div></div><button type="button" class="secondary small" data-vh-open-trade-history data-vh-trade-team="${esc(id)}">Open Trade History</button></div>`;
  const t=trades[0];if(!t)return`<div class="vh-card"><div class="vh-card-head"><div><h3>Recent Trade Impact</h3><div class="vh-sub">No completed Sleeper trades found for this team in the imported history.</div></div></div><button type="button" class="secondary small" data-vh-open-trade-history data-vh-trade-team="${esc(id)}">Open Trade History</button></div>`;
  const side=(t.sides||[]).find(x=>String(x.roster_id)===id),m=side?sideValueModel(side,t):null,delta=m?.atTradeTotal!=null&&m?.currentTotal!=null?m.currentTotal-m.atTradeTotal:null;
  return`<div class="vh-card"><div class="vh-card-head"><div><h3>Recent Trade Impact</h3><div class="vh-sub">Latest completed trade involving ${esc(teamName(id))}: ${esc(dateShort(t.created))}</div></div></div><div class="vh-attribution-summary"><div class="vh-attribution-stat"><small>Value at trade</small><b>${m?.atTradeTotal==null?'—':fmt(m.atTradeTotal)}</b></div><div class="vh-attribution-stat"><small>Current outcome</small><b>${m?.currentTotal==null?'—':fmt(m.currentTotal)}</b></div><div class="vh-attribution-stat"><small>Change</small><b class="${delta==null?'vh-neutral':deltaClass(delta)}">${delta==null?'—':signed(delta)}</b></div></div><button type="button" class="secondary small" data-vh-open-trade-history data-vh-trade-team="${esc(id)}">View full Trade History</button></div>`
}
async function historyFetch(id){let last;for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(`${API}?player_id=${encodeURIComponent(id)}`,{cache:'no-store'});if(!r.ok)throw Error('history unavailable');return await r.json()}catch(e){last=e;if(attempt===0)await new Promise(r=>setTimeout(r,220))}}throw last||Error('history unavailable')}
async function marketFetch(){let last;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(`${API}?market=1`,{cache:'no-store'});if(!r.ok)throw Error(`market history unavailable (${r.status})`);return await r.json()}catch(e){last=e;if(attempt<2)await new Promise(r=>setTimeout(r,250*(attempt+1)))}}throw last||Error('market history unavailable')}
function teamNetCacheKey(ids,teamId){return`${String(teamId||'')}|${(ids||[]).map(String).sort().join(',')}`}
async function teamNetFetch(ids,teamId){
  const playerKey=(ids||[]).map(String).sort().join(','),key=teamNetCacheKey(ids,teamId),cached=teamNetCache.get(key);
  if(cached)return cached;
  const r=await fetch(`${API}?team_net=1&team_id=${encodeURIComponent(String(teamId||''))}&player_ids=${encodeURIComponent(playerKey)}`,{cache:'no-store'});
  if(!r.ok)throw Error('team net history unavailable');
  const data=await r.json();teamNetCache.set(key,data);return data;
}
async function ensureMarketCache(force=false){if(!marketCache||force){const data=await marketFetch();marketCache=data.market||{}}return marketCache}
async function loadMarket(force=false){
  const box=document.getElementById('vhContent');if(!box)return;
  currentView='market';syncSubnav();currentPlayerId=null;
  if(!marketCache||force){box.innerHTML='<div class="vh-empty">Loading market dashboard…</div>';try{await ensureMarketCache(force)}catch{box.innerHTML='<div class="notice">Historical market data is temporarily unavailable. Current values and all trade tools are unaffected.</div>';return}}
  renderMarketDashboard();
}
function deltaClass(n){return Number(n)>0?'vh-up':Number(n)<0?'vh-down':'vh-neutral'}
function moverRows(rows,mode='value',limit=10){
  if(!rows?.length)return'<div class="vh-empty">Not enough historical movement yet.</div>';
  const shown=Number.isFinite(limit)?rows.slice(0,limit):rows;
  return`<div class="vh-list">${shown.map((r,i)=>{const delta=mode==='posRank'?r.posRankDelta:mode==='rank'?r.overallDelta:r.delta;const suffix=mode==='posRank'?`${delta>0?'+':''}${delta} pos ranks`:mode==='rank'?`${delta>0?'+':''}${delta} ranks`:signed(delta);return`<div class="vh-mover"><div class="vh-ranknum">${i+1}</div><button class="vh-player-link" data-vh-player="${esc(r.id)}"><b>${esc(playerName(r.id))}</b><small>${esc(r.pos)} #${r.posRank} • ${esc(String(state.players?.[String(r.id)]?.team||'FA').toUpperCase())} • Overall #${r.overall} • Value ${fmt(r.value)}</small></button><div class="vh-delta ${deltaClass(delta)}">${suffix}</div><button type="button" class="secondary small vh-view-chart" data-vh-player="${esc(r.id)}">View chart</button></div>`}).join('')}</div>`;
}
function marketPeriodButtons(category){
  const selected=marketPeriods[category]||'7D';
  return`<div class="vh-card-periods">${['1D','7D','30D','90D','1Y','ALL'].map(p=>`<button type="button" class="${p===selected?'':'secondary '}small" data-vh-category="${category}" data-vh-market-period="${p}">${p}</button>`).join('')}</div>`;
}
function periodLabel(period,m){
  if(period==='ALL')return'Since Tracking Began';
  if(period==='1D'&&!m.has1)return'Available History';
  if(period==='1Y'&&!m.has365)return'Since Tracking Began';
  if(period==='90D'&&!m.has90)return'Available History';
  if(period==='30D'&&!m.has30)return'Available History';
  if(period==='7D'&&!m.has7)return'Available History';
  return period.replace('1Y','1 Year');
}
function moverPool(scope,category){return scope==='team'?(teamPools[category]||'ALL'):(marketPools[category]||'ALL')}
function applyMoverPool(rows,scope,category){const pool=moverPool(scope,category),max=pool==='ALL'?Infinity:Number(pool);return(rows||[]).filter(r=>!Number.isFinite(max)||Number(r.overall)<=max)}
function moverCardActions(scope,category,period){
  const periodAttr=scope==='team'?'data-vh-team-period':'data-vh-market-period',poolAttr=scope==='team'?'data-vh-team-pool':'data-vh-market-pool';
  const selected=scope==='team'?(teamPeriods[category]||period):(marketPeriods[category]||period),pool=moverPool(scope,category);
  return`<div class="vh-card-actions"><div class="vh-card-periods">${['1D','7D','30D','90D','1Y','ALL'].map(p=>`<button type="button" class="${p===selected?'':'secondary '}small" data-vh-category="${category}" ${periodAttr}="${p}">${p}</button>`).join('')}</div><div class="vh-pool-filter"><span>Player pool</span>${['100','200','300','500','ALL'].map(p=>`<button type="button" class="${p===pool?'':'secondary '}small" data-vh-category="${category}" ${poolAttr}="${p}">${p==='ALL'?'All':`Top ${p}`}</button>`).join('')}</div><button type="button" class="secondary small vh-view-all" data-vh-view-all="1" data-vh-scope="${scope}" data-vh-category="${category}" data-vh-period="${selected}">View full list</button></div>`;
}
function closeMoverModal(){document.getElementById('vhMoverModal')?.remove()}
function openMoverModal(_,category,period,scope='market'){
  closeMoverModal();
  const m=marketCache||{},p=m.periods?.[period]||{},owned=scope==='team'?new Set((state.allAssets||[]).filter(a=>a?.type==='player'&&String(a.owner)===String(trackedTeamId)).map(a=>String(a.id))):null;
  const mode=category.startsWith('posRank')?'posRank':category.startsWith('rank')?'rank':'value',rows=applyMoverPool((p?.[category]||[]).filter(r=>!owned||owned.has(String(r.id))),scope,category);
  const titleMap={valueRisers:'Value Risers',valueFallers:'Value Fallers',rankRisers:'Overall Rank Risers',rankFallers:'Overall Rank Fallers',posRankRisers:'Positional Rank Risers',posRankFallers:'Positional Rank Fallers'};
  const wrap=document.createElement('div');wrap.id='vhMoverModal';wrap.className='vh-modal-backdrop';wrap.innerHTML=`<div class="vh-modal" role="dialog" aria-modal="true" aria-label="${esc(titleMap[category]||'Movers')}"><div class="vh-modal-head"><div><h3>${scope==='team'?`${esc(teamName(trackedTeamId))} — `:''}${esc(titleMap[category]||'Movers')} — ${esc(periodLabel(period,m))}</h3><div class="vh-sub">${rows.length} players moved in this period</div></div><button type="button" class="secondary small" data-vh-modal-close>Close</button></div><div class="vh-modal-body">${moverRows(rows,mode,Infinity)}</div></div>`;document.getElementById('vhLazy')?.appendChild(wrap);
}
function renderMarketDashboard(){
  const box=document.getElementById('vhContent');if(!box||!marketCache)return;
  const m=marketCache,status=document.getElementById('vhStatus');
  if(status)status.textContent=m.latest?`Tracking since ${dateShort(m.tracking_since)} • Latest snapshot ${dateTime(m.latest)} • ${fmt(m.snapshot_count)} snapshots`:'Initializing first historical snapshot…';
  const vr=marketPeriods.valueRisers,vf=marketPeriods.valueFallers,rr=marketPeriods.rankRisers,rf=marketPeriods.rankFallers;
  const vpR=m.periods?.[vr]||{},vpF=m.periods?.[vf]||{},rpR=m.periods?.[rr]||{},rpF=m.periods?.[rf]||{};
  box.innerHTML=`
  <div class="vh-grid-2">
    <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Biggest Value Risers — ${periodLabel(vr,m)}</h3><div class="vh-sub">Largest increases in finished player value</div></div>${moverCardActions('market','valueRisers',vr)}</div>${moverRows(applyMoverPool(vpR.valueRisers,'market','valueRisers'))}</div>
    <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Biggest Value Fallers — ${periodLabel(vf,m)}</h3><div class="vh-sub">Largest decreases in finished player value</div></div>${moverCardActions('market','valueFallers',vf)}</div>${moverRows(applyMoverPool(vpF.valueFallers,'market','valueFallers'))}</div>
  </div>
  <div class="vh-grid-2">
    <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Biggest Rank Risers — ${periodLabel(rr,m)}</h3><div class="vh-sub">Largest improvements in overall rank</div></div>${moverCardActions('market','rankRisers',rr)}</div>${moverRows(applyMoverPool(rpR.rankRisers,'market','rankRisers'),'rank')}</div>
    <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Biggest Rank Fallers — ${periodLabel(rf,m)}</h3><div class="vh-sub">Largest declines in overall rank</div></div>${moverCardActions('market','rankFallers',rf)}</div>${moverRows(applyMoverPool(rpF.rankFallers,'market','rankFallers'),'rank')}</div>
  </div>
  <details class="vh-card vh-market-table"><summary><span>Full Market History Table</span><span class="vh-details-state"><span class="vh-state-open">Open</span><span class="vh-state-close">Close</span></span></summary><div class="vh-sub" style="margin-top:10px">Sort the current market by value or historical movement. Select any player to open their profile.</div><input id="vhMarketSearch" type="search" placeholder="Filter market table…" style="margin:0 0 10px"><div id="vhMarketTable"></div></details>`;
  document.getElementById('vhMarketSearch')?.addEventListener('input',renderMarketTable);
  renderMarketTable();
}
function marketTableRowsMarkup(rows){
  const arrow=r=>Number(r.overallDelta7)>0?'<span class="vh-rank-arrow vh-up" title="Overall rank improved in the last 7 days">▲</span>':Number(r.overallDelta7)<0?'<span class="vh-rank-arrow vh-down" title="Overall rank fell in the last 7 days">▼</span>':'';
  return`<div class="vh-table-wrap"><table class="vh-table"><thead><tr><th data-vh-sort="name">Player</th><th data-vh-sort="value">Value</th><th data-vh-sort="delta1">Value Δ 1D</th><th data-vh-sort="delta7">Value 7D</th><th data-vh-sort="delta30">Value 30D</th><th data-vh-sort="delta365">Value 1Y</th><th data-vh-sort="deltaAll">Value All</th><th data-vh-sort="overall">Overall</th><th data-vh-sort="overallDelta7">Overall Δ 7D</th><th data-vh-sort="posRank">Pos Rank</th><th data-vh-sort="posRankDelta1">Pos Δ 1D</th><th data-vh-sort="posRankDelta7">Pos Δ 1W</th><th data-vh-sort="posRankDelta30">Pos Δ 30D</th><th data-vh-sort="posRankDeltaAll">Pos Δ All</th><th class="vh-chart-col">Chart</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="vh-player-link" data-vh-player="${esc(r.id)}"><b>${esc(playerName(r.id))}</b><small>${esc(r.pos)} • ${esc(String(state.players?.[String(r.id)]?.team||'FA').toUpperCase())}</small></button></td><td>${fmt(r.value)}</td><td class="${deltaClass(r.delta1)}">${r.delta1==null?'—':signed(r.delta1)}</td><td class="${deltaClass(r.delta7)}">${r.delta7==null?'—':signed(r.delta7)}</td><td class="${deltaClass(r.delta30)}">${r.delta30==null?'—':signed(r.delta30)}</td><td class="${deltaClass(r.delta365)}">${r.delta365==null?'—':signed(r.delta365)}</td><td class="${deltaClass(r.deltaAll)}">${r.deltaAll==null?'—':signed(r.deltaAll)}</td><td><span class="vh-overall-cell">#${r.overall}${arrow(r)}</span></td><td class="${deltaClass(r.overallDelta7)}">${r.overallDelta7==null?'—':signed(r.overallDelta7)}</td><td>${esc(r.pos)} #${r.posRank}</td><td class="${deltaClass(r.posRankDelta1)}">${r.posRankDelta1==null?'—':signed(r.posRankDelta1)}</td><td class="${deltaClass(r.posRankDelta7)}">${r.posRankDelta7==null?'—':signed(r.posRankDelta7)}</td><td class="${deltaClass(r.posRankDelta30)}">${r.posRankDelta30==null?'—':signed(r.posRankDelta30)}</td><td class="${deltaClass(r.posRankDeltaAll)}">${r.posRankDeltaAll==null?'—':signed(r.posRankDeltaAll)}</td><td class="vh-chart-col"><button type="button" class="secondary small vh-view-chart" data-vh-player="${esc(r.id)}">View</button></td></tr>`).join('')}</tbody></table></div>`;
}
function sortedMarketRows(rows,query=''){
  const q=norm(query),out=(rows||[]).filter(r=>!q||norm(playerName(r.id)).includes(q)).slice(),key=marketSort.key,dir=marketSort.dir;
  out.sort((a,b)=>{if(key==='name')return dir*String(playerName(a.id)).localeCompare(String(playerName(b.id)));const av=Number(a[key]),bv=Number(b[key]);if(!Number.isFinite(av)&&!Number.isFinite(bv))return 0;if(!Number.isFinite(av))return 1;if(!Number.isFinite(bv))return-1;return dir*(av-bv)});
  return out;
}
function renderMarketTable(){
  const host=document.getElementById('vhMarketTable');if(!host||!marketCache)return;
  const rows=sortedMarketRows(marketCache.marketRows||[],document.getElementById('vhMarketSearch')?.value||'');
  host.innerHTML=marketTableRowsMarkup(rows);
}
async function loadPlayer(id){
  const box=document.getElementById('vhContent');if(!box)return;box.innerHTML='<div class="vh-empty">Loading player history…</div>';
  try{const data=await historyFetch(id),pts=Array.isArray(data.points)?data.points:[];playerScoringCache.set(String(id),data.scoring_milestones||null);renderPlayerProfile(id,pts,'ALL')}catch{box.innerHTML='<div class="notice">Historical data is temporarily unavailable. Current values and all trade tools are unaffected.</div>'}
}

function leagueTeamIds(){
  const ids=new Set();for(const a of state.allAssets||[])if(a?.owner!=null)ids.add(String(a.owner));
  return[...ids].sort((a,b)=>String(teamName(a)).localeCompare(String(teamName(b))));
}
function renderTrackMyTeam(){
  currentView='team';syncSubnav();currentPlayerId=null;
  const box=document.getElementById('vhContent');if(!box)return;
  const ids=leagueTeamIds(),selected=trackedTeamId&&ids.includes(String(trackedTeamId))?String(trackedTeamId):'';
  const status=document.getElementById('vhStatus');if(status)status.textContent='Track a league roster using the same data as Full Market History.';
  box.innerHTML=`<div class="vh-card vh-team-picker"><div class="vh-card-head"><div><h3>Track My Team</h3><div class="vh-sub">Select one of the 32 league teams. This table is the Full Market History dataset filtered to that team's current players.</div></div></div><div class="vh-team-toolbar"><label><b>Fantasy team</b><select data-vh-team-select><option value="">Select a team…</option>${ids.map(id=>`<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(teamName(id))}</option>`).join('')}</select></label></div></div><div id="vhTrackedTeam"></div>`;
  if(selected)loadTrackedTeam();
}
async function loadTrackedTeam(){
  currentView='team';syncSubnav();const host=document.getElementById('vhTrackedTeam');if(!host)return;
  if(!trackedTeamId){host.innerHTML='';return}
  host.innerHTML='<div class="vh-card"><div class="vh-empty">Refreshing team market history…</div></div>';
  const ids=(state.allAssets||[]).filter(a=>a?.type==='player'&&String(a.owner)===String(trackedTeamId)).map(a=>String(a.id));
  let netData={points:[],player_count:ids.length};
  try{const results=await Promise.all([ensureMarketCache(!marketCache),teamNetFetch(ids,trackedTeamId)]);netData=results[1]||netData}catch{try{await ensureMarketCache(!marketCache)}catch{host.innerHTML='<div class="notice">Team market history is temporarily unavailable. Current values and all trade tools are unaffected.</div>';return}}
  renderTrackedTeamTable(netData);
  if(!tradeHistoryCache){const teamAtLoad=String(trackedTeamId);tradeHistoryFetch().then(()=>{if(currentView==='team'&&String(trackedTeamId)===teamAtLoad)renderTrackedTeamTable(netData)}).catch(()=>{})}
}
function teamNetPointTradeMap(teamId,points){
  const id=String(teamId||''),auth=(points||[]).filter(p=>p?.teamSnapshot===true&&p?.t&&Number.isFinite(Number(p.value))).slice().sort((a,b)=>String(a.t).localeCompare(String(b.t))),map=new Map();
  if(auth.length<2||!tradeHistoryCache||!id)return map;
  const trades=(tradeHistoryCache.trades||[]).filter(t=>(t.roster_ids||[]).map(String).includes(id));
  for(let i=1;i<auth.length;i++){
    const prev=auth[i-1],cur=auth[i],a=new Date(prev.t).getTime(),b=new Date(cur.t).getTime();
    if(!Number.isFinite(a)||!Number.isFinite(b))continue;
    const events=trades.filter(t=>{const tm=new Date(t?.created||0).getTime();return Number.isFinite(tm)&&tm>a&&tm<=b}).map(t=>({id:String(t.id||''),date:dateShort(t.created),counterparts:(t.roster_ids||[]).map(String).filter(x=>x!==id).map(x=>historicalTradeTeamName(t,x)).join(' / ')||'another team'}));
    if(events.length)map.set(String(cur.t),{events,change:Math.round(Number(cur.value)-Number(prev.value))});
  }
  return map;
}
function teamNetChart(points){
  const pts=(points||[]).filter(p=>Number.isFinite(Number(p?.value))&&p?.t);
  if(!pts.length)return'<div class="vh-empty">Net-value history will appear after a completed Value History snapshot.</div>';
  const tradeMap=teamNetPointTradeMap(trackedTeamId,pts),vals=pts.map(p=>Number(p.value)),min=Math.min(...vals),max=Math.max(...vals),pad=Math.max(200,(max-min)*.12),lo=Math.max(0,min-pad),hi=max+pad,W=900,H=142,L=70,R=18,T=12,B=30,n=Math.max(1,pts.length-1),
    x=i=>L+(W-L-R)*(i/n),y=v=>T+(H-T-B)*(1-(Number(v)-lo)/Math.max(1,hi-lo)),first=pts[0],last=pts[pts.length-1],
    path=pts.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' '),
    dots=pts.map((p,i)=>{const linked=tradeMap.get(String(p.t)),tradeAttr=linked?` data-vh-trades="${esc(JSON.stringify(linked))}"`:'',dotClass=linked?'vh-net-dot vh-net-trade-dot':'vh-net-dot';return`<circle class="${dotClass}" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="${linked?5:4}"/><circle class="vh-net-hit" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="13" data-vh-date="${esc(dateTime(p.t))}" data-vh-net-value="${fmt(p.value)}"${tradeAttr}></circle>`}).join('');
  return`<div class="vh-net-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Overall Net Value history"><line class="vh-net-axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><line class="vh-net-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><text class="vh-net-axis-text" x="${L-8}" y="${T+4}" text-anchor="end">${fmt(Math.round(hi))}</text><text class="vh-net-axis-text" x="${L-8}" y="${H-B}" text-anchor="end">${fmt(Math.round(lo))}</text><text class="vh-net-axis-text" x="${L}" y="${H-8}">${esc(dateShort(first.t))}</text><text class="vh-net-axis-text" x="${W-R}" y="${H-8}" text-anchor="end">${esc(dateShort(last.t))}</text><path class="vh-net-line" d="${path}"/>${dots}</svg><div class="vh-chart-tooltip" style="display:none"></div></div>`;
}
function currentTeamNetStandings(){
  const rows=currentRows(),marketById=new Map((marketCache?.marketRows||[]).map(r=>[String(r.id),r])),valueById=new Map(rows.map(r=>[String(r.id),Number(r.value)||0])),totals=new Map();
  for(const t of state.teams||[])totals.set(String(t.id),{value:0,delta7:0,delta30:0,count:0,known7:0,known30:0});
  for(const a of state.allAssets||[]){
    if(a?.type!=='player')continue;const owner=String(a.owner||''),bucket=totals.get(owner);if(!bucket)continue;
    const id=String(a.id),value=valueById.get(id)||0,m=marketById.get(id);bucket.value+=value;bucket.count++;
    if(Number.isFinite(Number(m?.delta7))){bucket.delta7+=Number(m.delta7);bucket.known7++}
    if(Number.isFinite(Number(m?.delta30))){bucket.delta30+=Number(m.delta30);bucket.known30++}
  }
  const all=[...totals].map(([id,x])=>({id,name:teamName(id),value:Math.round(x.value),delta7:Math.round(x.delta7),delta30:Math.round(x.delta30),coverage7:x.count?x.known7/x.count:0,coverage30:x.count?x.known30/x.count:0}));
  all.sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));all.forEach((x,i)=>x.rank=i+1);
  const rankBaseline=(period)=>{
    const coverageKey=period==='7D'?'coverage7':'coverage30',deltaKey=period==='7D'?'delta7':'delta30';
    if(!all.every(x=>x[coverageKey]===1))return new Map();
    const base=all.map(x=>({id:x.id,value:x.value-x[deltaKey]})).sort((a,b)=>b.value-a.value||String(a.id).localeCompare(String(b.id))),map=new Map();
    base.forEach((x,i)=>map.set(x.id,i+1));return map;
  };
  const r7=rankBaseline('7D'),r30=rankBaseline('30D');
  for(const x of all){x.rankDelta7=r7.has(x.id)?r7.get(x.id)-x.rank:null;x.rankDelta30=r30.has(x.id)?r30.get(x.id)-x.rank:null}
  return all;
}
function teamNetNeighbors(){
  const all=currentTeamNetStandings(),idx=all.findIndex(x=>String(x.id)===String(trackedTeamId));
  if(idx<0)return{all,neighbors:[]};
  return{all,neighbors:[...all.slice(Math.max(0,idx-2),idx),all[idx],...all.slice(idx+1,idx+3)]};
}
function sortedTeamNetRows(){
  const all=currentTeamNetStandings(),key=teamNetSort.key,dir=teamNetSort.dir;
  return all.slice().sort((a,b)=>{
    if(key==='name')return dir*a.name.localeCompare(b.name);
    const av=a[key],bv=b[key];if(av==null&&bv==null)return a.rank-b.rank;if(av==null)return 1;if(bv==null)return-1;
    return dir*(Number(av)-Number(bv))||a.rank-b.rank;
  });
}
function teamNetSortHeader(label,key){const active=teamNetSort.key===key,arrow=active?(teamNetSort.dir>0?' ▲':' ▼'):'';return`<button type="button" class="vh-team-net-sort" data-vh-team-net-sort="${key}">${label}${arrow}</button>`}
function openTeamNetModal(){
  closeMoverModal();const all=sortedTeamNetRows(),wrap=document.createElement('div');wrap.id='vhMoverModal';wrap.className='vh-modal-backdrop';
  const delta=n=>n==null?'—':`<span class="${deltaClass(n)}">${signed(n)}</span>`;
  wrap.innerHTML=`<div class="vh-modal" role="dialog" aria-modal="true" aria-label="All team net values"><div class="vh-modal-head"><div><h3>All 32 Teams — Overall Net Value</h3><div class="vh-sub">Current totals plus current-roster value movement from stored Value History snapshots. Rank change appears only when every current roster asset has baseline coverage.</div></div><button type="button" class="secondary small" data-vh-modal-close>Close</button></div><div class="vh-modal-body"><div class="vh-team-net-table"><div class="vh-team-net-row vh-team-net-head"><div>Rank</div><div>${teamNetSortHeader('Team name','name')}</div><div>${teamNetSortHeader('Total value','value')}</div><div>${teamNetSortHeader('7D Δ','delta7')}</div><div>${teamNetSortHeader('30D Δ','delta30')}</div><div>${teamNetSortHeader('30D Rank Δ','rankDelta30')}</div></div>${all.map(t=>`<div class="vh-team-net-row"><div>#${t.rank}</div><div><b>${esc(t.name)}</b></div><div>${fmt(t.value)}</div><div>${delta(t.coverage7?t.delta7:null)}</div><div>${delta(t.coverage30?t.delta30:null)}</div><div>${delta(t.rankDelta30)}</div></div>`).join('')}</div></div></div>`;
  (document.getElementById('vhLazy')||document.getElementById('valueHistory')||document.body).appendChild(wrap);
}
function overallNetValueCard(data,teamLabel){
  const pts=Array.isArray(data?.points)?data.points:[],last=pts[pts.length-1],total=last?Number(last.value):0,count=Number(data?.player_count)||0,
    high=pts.reduce((best,p)=>!best||Number(p.value)>Number(best.value)?p:best,null),low=pts.reduce((best,p)=>!best||Number(p.value)<Number(best.value)?p:best,null),
    {neighbors}=teamNetNeighbors();
  const neighborMarkup=neighbors.map(t=>`<div class="vh-team-neighbor ${String(t.id)===String(trackedTeamId)?'current':''}"><small>${String(t.id)===String(trackedTeamId)?'Selected team':'Nearby team'}</small><b>${esc(t.name)}</b><strong>${fmt(t.value)}</strong></div>`).join('');
  return`<div class="vh-card vh-net-card"><div class="vh-net-head"><div><h3 class="vh-section-heading">Overall Net Value</h3><div class="vh-sub">${esc(teamLabel)} player value across recorded team snapshots</div></div><div class="vh-net-total"><small>Current total</small><b>${fmt(total)}</b></div></div><div class="vh-net-metrics"><div class="vh-net-metric"><small>Current net value</small><b>${fmt(total)}</b><span>${count} current players</span></div><div class="vh-net-metric"><small>All-time high</small><b>${high?fmt(high.value):'—'}</b><span>${high?esc(dateTime(high.t)):'No history yet'}</span></div><div class="vh-net-metric"><small>All-time low</small><b>${low?fmt(low.value):'—'}</b><span>${low?esc(dateTime(low.t)):'No history yet'}</span></div></div>${teamNetChart(pts)}<div class="vh-team-neighbors"><div class="vh-team-neighbors-head"><h4>League Net Value Comparison</h4><button type="button" class="secondary small" data-vh-team-net-all>View all</button></div><div class="vh-team-neighbor-list">${neighborMarkup}</div></div><div class="vh-net-note">Simple addition of the selected team's ${count} current player values. No scarcity, fit, package, Trade Finder, Trade Evaluator, or other adjustments are applied.</div></div>`;
}
function teamTradeNetEvents(teamId,netData,period){
  const id=String(teamId),days=period==='30D'?30:7,pts=(netData?.points||[]).filter(p=>p?.teamSnapshot===true&&p?.t&&Number.isFinite(Number(p.value))).slice().sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  if(pts.length<2||!tradeHistoryCache)return[];
  const latestMs=new Date(pts[pts.length-1].t).getTime(),cutoff=latestMs-days*86400000,trades=(tradeHistoryCache.trades||[]).filter(t=>(t.roster_ids||[]).map(String).includes(id));
  const out=[];
  for(const trade of trades){
    const tm=new Date(trade?.created||0).getTime();if(!Number.isFinite(tm)||tm<cutoff||tm>latestMs)continue;
    let idx=-1;
    for(let i=1;i<pts.length;i++){const prevMs=new Date(pts[i-1].t).getTime(),curMs=new Date(pts[i].t).getTime();if(tm>prevMs&&tm<=curMs){idx=i;break}}
    if(idx<1)continue;
    const point=pts[idx],prev=pts[idx-1],others=(trade.roster_ids||[]).map(String).filter(x=>x!==id).map(x=>historicalTradeTeamName(trade,x));
    out.push({trade,point,prev,change:Math.round(Number(point.value)-Number(prev.value)),counterpart:others.join(' / ')||'another team'});
  }
  return out.sort((a,b)=>String(b.trade.created).localeCompare(String(a.trade.created)));
}
function teamAttributionCard(owned,netData,teamId){
  const period=teamAttributionPeriod==='30D'?'30D':'7D',key=period==='30D'?'delta30':'delta7',rows=(marketCache?.marketRows||[]).filter(r=>owned.has(String(r.id))&&Number.isFinite(Number(r?.[key]))).map(r=>({...r,move:Number(r[key])}));
  const gains=rows.filter(r=>r.move>0).sort((a,b)=>b.move-a.move).slice(0,5),losses=rows.filter(r=>r.move<0).sort((a,b)=>a.move-b.move).slice(0,5),net=rows.reduce((n,r)=>n+r.move,0),up=gains.reduce((n,r)=>n+r.move,0),down=losses.reduce((n,r)=>n+r.move,0),tradeEvents=teamTradeNetEvents(teamId,netData,period);
  const driver=list=>list.length?list.map(r=>`<div class="vh-driver-row"><div><b>${esc(playerName(r.id))}</b><small>${esc(r.pos)} #${r.posRank} • Current value ${fmt(r.value)}</small></div><div class="${deltaClass(r.move)}"><b>${signed(r.move)}</b></div></div>`).join(''):'<div class="vh-empty">No qualifying movement in this period.</div>';
  const tradeRows=tradeEvents.length?tradeEvents.map(e=>`<div class="vh-team-trade-event"><div class="vh-team-trade-event-main"><span class="vh-trade-event-badge">Trade</span><div><b>${esc(dateShort(e.trade.created))} • vs. ${esc(e.counterpart)}</b><small>Linked to recorded team net-value point: ${esc(dateTime(e.point.t))}</small></div></div><div class="vh-team-trade-event-value"><small>Team net value</small><b>${fmt(e.point.value)}</b><span class="${deltaClass(e.change)}">${signed(e.change)} from prior team snapshot</span></div><button type="button" class="secondary small" data-vh-open-trade-history data-vh-trade-team="${esc(String(teamId))}">View trade</button></div>`).join(''):`<div class="vh-empty">No completed trades in this period are bracketed by authoritative team net-value snapshots yet.</div>`;
  return`<div class="vh-card"><div class="vh-card-head"><div><h3>What's Happening With My Team</h3><div class="vh-sub">Current-roster value movement plus completed trade events linked to recorded team net-value points. Descriptive only; these observations never change player values or trade calculations.</div></div><div class="vh-card-periods">${['7D','30D'].map(p=>`<button type="button" class="${p===period?'':'secondary '}small" data-vh-team-attribution="${p}">${p}</button>`).join('')}</div></div><div class="vh-attribution-summary"><div class="vh-attribution-stat"><small>Net current-roster change</small><b class="${deltaClass(net)}">${signed(net)}</b></div><div class="vh-attribution-stat"><small>Value gained</small><b class="vh-up">${signed(up)}</b></div><div class="vh-attribution-stat"><small>Value lost</small><b class="vh-down">${signed(down)}</b></div></div><div class="vh-grid-2"><div><h3>Biggest positive drivers</h3><div class="vh-driver-list">${driver(gains)}</div></div><div><h3>Biggest negative drivers</h3><div class="vh-driver-list">${driver(losses)}</div></div></div><div class="vh-team-trade-events"><div class="vh-team-trade-events-head"><h3>Trade-linked team net-value points</h3><div class="vh-sub">A trade is linked only when real team snapshots exist immediately before and after it. The snapshot change is observed team net-value movement, not an assumption that the trade alone caused the move.</div></div>${tradeRows}</div></div>`;
}

function renderTrackedTeamTable(netData={points:[]}){
  const host=document.getElementById('vhTrackedTeam');if(!host||!marketCache||!trackedTeamId)return;
  const owned=new Set((state.allAssets||[]).filter(a=>a?.type==='player'&&String(a.owner)===String(trackedTeamId)).map(a=>String(a.id)));
  const rows=sortedMarketRows((marketCache.marketRows||[]).filter(r=>owned.has(String(r.id))));
  const periodRows=(category,period)=>(marketCache.periods?.[period]?.[category]||[]).filter(r=>owned.has(String(r.id)));
  const vr=teamPeriods.valueRisers,vf=teamPeriods.valueFallers,rr=teamPeriods.rankRisers,rf=teamPeriods.rankFallers,prr=teamPeriods.posRankRisers,prf=teamPeriods.posRankFallers;
  host.innerHTML=`
    ${overallNetValueCard(netData,teamName(trackedTeamId))}
    ${teamAttributionCard(owned,netData,trackedTeamId)}
    <div class="vh-grid-2">
      <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Top Value Risers — ${periodLabel(vr,marketCache)}</h3><div class="vh-sub">Largest value gains on ${esc(teamName(trackedTeamId))}</div></div>${moverCardActions('team','valueRisers',vr)}</div>${moverRows(applyMoverPool(periodRows('valueRisers',vr),'team','valueRisers'))}</div>
      <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Top Value Fallers — ${periodLabel(vf,marketCache)}</h3><div class="vh-sub">Largest value declines on ${esc(teamName(trackedTeamId))}</div></div>${moverCardActions('team','valueFallers',vf)}</div>${moverRows(applyMoverPool(periodRows('valueFallers',vf),'team','valueFallers'))}</div>
    </div>
    <div class="vh-grid-2">
      <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Top Rank Risers — ${periodLabel(rr,marketCache)}</h3><div class="vh-sub">Largest overall-rank improvements on ${esc(teamName(trackedTeamId))}</div></div>${moverCardActions('team','rankRisers',rr)}</div>${moverRows(applyMoverPool(periodRows('rankRisers',rr),'team','rankRisers'),'rank')}</div>
      <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Top Rank Fallers — ${periodLabel(rf,marketCache)}</h3><div class="vh-sub">Largest overall-rank declines on ${esc(teamName(trackedTeamId))}</div></div>${moverCardActions('team','rankFallers',rf)}</div>${moverRows(applyMoverPool(periodRows('rankFallers',rf),'team','rankFallers'),'rank')}</div>
    </div>
    <div class="vh-grid-2">
      <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Top Positional Rank Risers — ${periodLabel(prr,marketCache)}</h3><div class="vh-sub">Largest improvements within each player's position on ${esc(teamName(trackedTeamId))}</div></div>${moverCardActions('team','posRankRisers',prr)}</div>${moverRows(applyMoverPool(periodRows('posRankRisers',prr),'team','posRankRisers'),'posRank')}</div>
      <div class="vh-card vh-mover-card"><div class="vh-card-head"><div><h3>Top Positional Rank Fallers — ${periodLabel(prf,marketCache)}</h3><div class="vh-sub">Largest declines within each player's position on ${esc(teamName(trackedTeamId))}</div></div>${moverCardActions('team','posRankFallers',prf)}</div>${moverRows(applyMoverPool(periodRows('posRankFallers',prf),'team','posRankFallers'),'posRank')}</div>
    </div>
    <div class="vh-card"><div class="vh-card-head"><div><h3>${esc(teamName(trackedTeamId))} — Full Market History</h3><div class="vh-sub">${rows.length} current players • same columns and data as Full Market History</div></div></div>${marketTableRowsMarkup(rows)}</div>`;
}
function currentPlayerRows(){
  const list=ranked(),pr=posRanks(list),rows=[];
  for(let i=0;i<list.length;i++){const x=list[i]?.x;if(!x||x.type!=='player')continue;const value=Math.round(Number(tv().playerValue?.(x)||0));if(!Number.isFinite(value)||value<=0)continue;rows.push({id:String(x.id),value,overall:i+1,pos:groupPos(x),posRank:pr.get(String(x.id))||null})}
  return rows;
}
function similarPlayersSection(id){
  const rows=currentPlayerRows(),target=rows.find(r=>r.id===String(id));if(!target)return'';
  const byValue=rows.slice().sort((a,b)=>b.value-a.value),vi=byValue.findIndex(r=>r.id===target.id),valueAbove=byValue.slice(Math.max(0,vi-5),vi),valueBelow=byValue.slice(vi+1,vi+6);
  const same=rows.filter(r=>r.pos===target.pos).sort((a,b)=>(a.posRank||9999)-(b.posRank||9999)),pi=same.findIndex(r=>r.id===target.id),posAbove=same.slice(Math.max(0,pi-5),pi),posBelow=same.slice(pi+1,pi+6);
  const row=r=>`<div class="vh-neighbor-row"><button class="vh-player-link" data-vh-player="${esc(r.id)}"><b>${esc(playerName(r.id))}</b><small>${esc(String(state.players?.[r.id]?.team||'FA').toUpperCase())} • ${esc(r.pos)} • Overall #${r.overall} • Value ${fmt(r.value)} • ${esc(r.pos)} #${r.posRank||'—'}</small></button><button type="button" class="secondary small" data-vh-player="${esc(r.id)}">View chart</button></div>`;
  const group=(above,below)=>`<div class="vh-neighbor-list">${above.map(row).join('')}<div class="vh-selected-divider"><b>${esc(playerName(id))}</b><small>${esc(String(state.players?.[target.id]?.team||'FA').toUpperCase())} • ${esc(target.pos)} • Overall #${target.overall} • Value ${fmt(target.value)} • ${esc(target.pos)} #${target.posRank||'—'}</small></div>${below.map(row).join('')}</div>`;
  return`<div class="vh-card"><div class="vh-card-head"><div><h3 class="vh-similar-title">Similar Value Players</h3><div class="vh-sub">Current neighbors around ${esc(playerName(id))}; informational only.</div></div></div><div class="vh-similar-grid"><div><h3>Closest in Overall Value</h3><div class="vh-sub">5 players immediately above and below by current value</div>${group(valueAbove,valueBelow)}</div><div><h3>Nearest ${esc(target.pos)} Ranks</h3><div class="vh-sub">5 players immediately above and below in positional rank</div>${group(posAbove,posBelow)}</div></div></div>`;
}
function livePlayerMeta(id){
  const list=ranked(),pr=posRanks(list),idx=list.findIndex(z=>String(z?.x?.id)===String(id)),z=idx>=0?list[idx]:null,x=z?.x||{type:'player',id},p=state.players?.[String(id)]||{},asset=(state.allAssets||[]).find(a=>a?.type==='player'&&String(a.id)===String(id));
  const pos=groupPos(x),owner=asset?.owner,nfl=String(p.team||p.team_abbr||p.nfl_team||p.pro_team||'FA').toUpperCase();
  let age=Number(p.age);if(!Number.isFinite(age)){const bd=p.birth_date||p.birthdate||p.dob;if(bd){const d=new Date(bd),now=new Date();if(Number.isFinite(d.getTime())){age=now.getFullYear()-d.getFullYear();const before=now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate());if(before)age--}}}
  return{pos,nfl,ownerName:owner==null?'Free Agent':teamName(owner),age:Number.isFinite(age)&&age>0?age:null,overall:idx>=0?idx+1:null,posRank:pr.get(String(id))||null,value:Math.round(Number(tv().playerValue?.(x)||0))};
}
function periodPoints(pts,period){
  if(!pts.length||period==='ALL')return pts.slice();
  const days={ '1D':1,'7D':7,'30D':30,'90D':90,'1Y':365 }[period]||30,latest=new Date(pts[pts.length-1].t).getTime(),cut=latest-days*86400000;
  const inRange=pts.filter(p=>new Date(p.t).getTime()>=cut);
  if(!inRange.length)return[pts[pts.length-1]];
  if(period==='1D')return inRange;
  const firstIndex=pts.indexOf(inRange[0]);if(firstIndex>0)inRange.unshift(pts[firstIndex-1]);
  return inRange;
}
function rankSpark(points,field,axisLabel='Rank'){
  if(!points.length)return'<div class="vh-empty">No rank history yet.</div>';
  const clean=points.filter(p=>Number.isFinite(Number(p[field]))),vals=clean.map(p=>Number(p[field]));
  if(!clean.length)return'<div class="vh-empty">No rank history yet.</div>';
  const min=Math.min(...vals),max=Math.max(...vals),W=430,H=150,L=48,R=14,T=14,B=36,n=Math.max(1,clean.length-1),spread=Math.max(1,max-min),
    x=i=>L+(W-L-R)*(i/n),y=v=>T+(H-T-B)*((Number(v)-min)/spread),
    first=clean[0],last=clean[clean.length-1],
    dateLabel=t=>{try{return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch{return''}};
  const path=clean.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p[field]).toFixed(1)}`).join(' '),
    dots=clean.map((p,i)=>`<g><circle class="vh-rank-dot" cx="${x(i).toFixed(1)}" cy="${y(p[field]).toFixed(1)}" r="4"/><circle class="vh-rank-hit" cx="${x(i).toFixed(1)}" cy="${y(p[field]).toFixed(1)}" r="16" data-vh-date="${esc(dateTime(p.t))}" data-vh-rank="${p[field]}" data-vh-rank-label="${esc(axisLabel)}" tabindex="0" aria-label="${esc(dateTime(p.t))}: ${esc(axisLabel)} #${p[field]}"/></g>`).join('');
  return`<div class="vh-rank-chart" style="position:relative"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(axisLabel)} history"><line class="vh-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="vh-axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><text class="vh-axis-text" x="${L-7}" y="${T+4}" text-anchor="end">#${min}</text><text class="vh-axis-text" x="${L-7}" y="${H-B}" text-anchor="end">#${max}</text><text class="vh-axis-text" x="13" y="${(T+H-B)/2}" text-anchor="middle" transform="rotate(-90 13 ${(T+H-B)/2})">${esc(axisLabel)}</text><text class="vh-axis-text" x="${L}" y="${H-14}">${esc(dateLabel(first.t))}</text><text class="vh-axis-text" x="${W-R}" y="${H-14}" text-anchor="end">${esc(dateLabel(last.t))}</text><text class="vh-axis-text" x="${(L+W-R)/2}" y="${H-3}" text-anchor="middle">Date</text><path class="vh-rank-line" d="${path}"/>${dots}</svg><div class="vh-chart-tooltip" role="status" aria-live="polite"></div></div>`;
}
function valueChart(id,pts,allPts=pts){
  if(!pts.length)return`<div class="vh-empty">No historical observations recorded yet for ${esc(playerName(id))}. A point will appear after a completed value refresh is recorded.</div>`;
  const values=pts.map(p=>Number(p.value)).filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values),pad=Math.max(100,(max-min)*.15),lo=Math.max(0,min-pad),hi=max+pad,W=900,H=380,L=74,R=24,T=34,B=72,n=Math.max(1,pts.length-1),x=i=>L+(W-L-R)*(i/n),y=v=>T+(H-T-B)*(1-(Number(v)-lo)/Math.max(1,hi-lo));
  const path=pts.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' '),
    dots=pts.map((p,i)=>`<g><circle class="vh-point-dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="5"/><circle class="vh-point-hit" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="18" data-vh-date="${esc(dateTime(p.t))}" data-vh-value="${fmt(p.value)}" data-vh-overall="${p.overall}" data-vh-pos="${esc(p.pos)}" data-vh-pos-rank="${p.posRank}" tabindex="0" aria-label="${esc(dateTime(p.t))}: Value ${fmt(p.value)}, Overall rank ${p.overall}, ${esc(p.pos)} rank ${p.posRank}"/></g>`).join(''),first=pts[0],last=pts[pts.length-1],
    prev=allPts.length>1?allPts[allPts.length-2]:null,latest=allPts[allPts.length-1],refreshValue=prev?Number(latest.value)-Number(prev.value):null,refreshPos=prev?Number(prev.posRank)-Number(latest.posRank):null,
    refresh=`<div class="vh-refresh-callout"><span class="vh-refresh-label">Since last refresh</span><div class="vh-refresh-metrics"><div class="vh-refresh-metric"><small>Value change</small><strong class="${deltaClass(refreshValue)}">${refreshValue==null?'—':signed(refreshValue)}</strong></div><div class="vh-refresh-metric"><small>${esc(latest.pos)} rank change</small><strong class="${deltaClass(refreshPos)}">${refreshPos==null?'—':signed(refreshPos)}</strong></div></div></div>`,
    xLabel=t=>{try{return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch{return''}};
  return`<div class="vh-value-chart">${refresh}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(playerName(id))} value history"><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="currentColor" opacity=".25"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H-B}" stroke="currentColor" opacity=".25"/><text class="vh-value-axis" x="${L-10}" y="${T+5}" text-anchor="end">${Math.round(hi).toLocaleString()}</text><text class="vh-value-axis" x="${L-10}" y="${H-B}" text-anchor="end">${Math.round(lo).toLocaleString()}</text><text class="vh-value-axis" x="18" y="${(T+H-B)/2}" text-anchor="middle" transform="rotate(-90 18 ${(T+H-B)/2})">Player value</text><text class="vh-value-axis" x="${L}" y="${H-34}">${esc(xLabel(first.t))}</text><text class="vh-value-axis" x="${W-R}" y="${H-34}" text-anchor="end">${esc(xLabel(last.t))}</text><text class="vh-value-axis" x="${(L+W-R)/2}" y="${H-10}" text-anchor="middle">Date / time</text><path d="${path}" fill="none" stroke="#e4b53f" stroke-width="3.5" vector-effect="non-scaling-stroke"/>${dots}</svg><div class="vh-chart-tooltip" role="status" aria-live="polite"></div></div><p class="tiny muted">Move your pointer near a gold point or tap it to see timestamp, value, overall rank and positional rank.</p>`;
}
function recentChanges(pts){
  const rows=[];for(let i=pts.length-1;i>0&&rows.length<8;i--){const a=pts[i-1],b=pts[i],dv=Number(b.value)-Number(a.value),dr=Number(a.overall)-Number(b.overall),dp=Number(a.posRank)-Number(b.posRank);if(dv||dr||dp)rows.push({t:b.t,dv,dr,dp,value:b.value,overall:b.overall,pos:b.pos,posRank:b.posRank})}
  if(!rows.length)return'<div class="vh-empty">No value or rank changes recorded yet.</div>';
  return`<div class="vh-feed">${rows.map(r=>`<div class="vh-feed-row"><div><b>${esc(dateTime(r.t))}</b><div class="muted">Value ${fmt(r.value)} • Overall #${r.overall} • ${esc(r.pos)} #${r.posRank}</div></div><div style="text-align:right"><b class="${deltaClass(r.dv)}">${signed(r.dv)}</b><div class="muted">${r.dr?`${r.dr>0?'+':''}${r.dr} overall`:''}${r.dr&&r.dp?' • ':''}${r.dp?`${r.dp>0?'+':''}${r.dp} pos`:''}</div></div></div>`).join('')}</div>`;
}
function renderPlayerProfile(id,allPts,period='ALL'){
  const box=document.getElementById('vhContent');if(!box)return;
  if(!allPts.length){box.innerHTML=`<div class="vh-card"><div class="vh-toolbar"><button class="secondary small" data-vh-dashboard>← Market dashboard</button></div><div class="vh-empty">No historical observations recorded yet for ${esc(playerName(id))}. Their history begins with the first completed snapshot in which Sleeper makes them available to the current valuation database.</div></div>`;return}
  const meta=livePlayerMeta(id),pts=periodPoints(allPts,period),first=pts[0],last=pts[pts.length-1],delta=Number(last.value)-Number(first.value),pct=Number(first.value)?delta/Number(first.value)*100:0,vals=pts.map(p=>Number(p.value)),pmin=Math.min(...vals),pmax=Math.max(...vals),allVals=allPts.map(p=>Number(p.value)),allMin=Math.min(...allVals),allMax=Math.max(...allVals),bestOverall=Math.min(...allPts.map(p=>Number(p.overall))),bestPos=Math.min(...allPts.map(p=>Number(p.posRank))),lowestPos=Math.max(...allPts.map(p=>Number(p.posRank))),highPoint=allPts.find(p=>Number(p.value)===allMax),lowPoint=allPts.find(p=>Number(p.value)===allMin),bestOverallPoint=allPts.find(p=>Number(p.overall)===bestOverall),scoring=playerScoringCache.get(String(id))||null;
  const latestMs=new Date(allPts[allPts.length-1].t).getTime(),rank30=allPts.filter(p=>new Date(p.t).getTime()>=latestMs-30*86400000),rankBase=rank30[0]||allPts[0],rankLast=rank30[rank30.length-1]||allPts[allPts.length-1],overallMove=Number(rankBase.overall)-Number(rankLast.overall),posMove=Number(rankBase.posRank)-Number(rankLast.posRank);
  const status=document.getElementById('vhStatus');if(status)status.textContent=`Tracked since ${dateShort(allPts[0].t)} • ${fmt(allPts.length)} player observations`;
  box.innerHTML=`
  <div id="vhProfileData" data-points="${esc(JSON.stringify(allPts))}" hidden></div>
  <div class="vh-card">
    <div class="vh-toolbar" style="margin-bottom:12px"><button class="secondary small" data-vh-dashboard>← Market dashboard</button></div>
    <div class="vh-profile-info">
      <div class="vh-profile-primary"><h2>${esc(playerName(id))}</h2><div class="vh-profile-kicker"><span>${esc(meta.pos)}</span><span>${esc(meta.nfl)}</span>${meta.age?`<span>Age ${meta.age}</span>`:''}</div></div>
      <div class="vh-profile-facts">
        <div class="vh-profile-fact"><small>Fantasy team</small><b>${esc(meta.ownerName)}</b></div>
        <div class="vh-profile-fact"><small>NFL team</small><b>${esc(meta.nfl)}</b></div>
        <div class="vh-profile-fact"><small>Current rank</small><b>${meta.overall?`Overall #${meta.overall}`:'—'}</b><span>${meta.posRank?`${esc(meta.pos)} #${meta.posRank}`:'—'}</span></div>
        <div class="vh-profile-fact"><small>Tracked since</small><b>${dateShort(allPts[0].t)}</b><span>${fmt(allPts.length)} observations</span></div>
      </div>
      <div class="vh-current"><small class="muted">Current Value</small><div class="vh-big">${fmt(meta.value||last.value)}</div></div>
    </div>
  </div>
  <div class="vh-card vh-filter-card"><div class="vh-filter-label">History range</div><div class="vh-periods">${['1D','7D','30D','90D','1Y','ALL'].map(p=>`<button type="button" class="${p===period?'':'secondary '}small" data-vh-period="${p}">${p}</button>`).join('')}</div></div>
  <div class="vh-metrics">
    <div class="vh-metric"><small>${period} Change</small><b class="${deltaClass(delta)}">${signed(delta)}</b><div class="tiny muted">${signedPct(pct)}</div></div>
    <div class="vh-metric"><small>Value Range</small><b>${fmt(pmin)}–${fmt(pmax)}</b></div>
    <div class="vh-metric"><small>All-Time High</small><b>${fmt(allMax)}</b><div class="vh-metric-time">${highPoint?dateTime(highPoint.t):'—'}</div></div>
    <div class="vh-metric"><small>All-Time Low</small><b>${fmt(allMin)}</b><div class="vh-metric-time">${lowPoint?dateTime(lowPoint.t):'—'}</div></div>
    <div class="vh-metric"><small>Best Overall Rank</small><b>#${bestOverall}</b><div class="vh-metric-time">${bestOverallPoint?dateTime(bestOverallPoint.t):'—'}</div></div>
    <div class="vh-metric"><small>Best ${esc(meta.pos)} Rank</small><b>#${bestPos}</b><div class="vh-metric-time">&nbsp;</div></div>
  </div>
  <div class="vh-card vh-chart-card"><h3 class="vh-section-heading">${period==='ALL'?'All-Time':period} Value History</h3>${valueChart(id,pts,allPts)}</div>
  <div class="vh-rank-grid">
    <div class="vh-card"><h3 class="vh-section-heading">Overall Rank — Last 30 Days</h3><div class="vh-rank-stat"><span class="muted">#${rankBase.overall} → #${rankLast.overall}</span><b class="${deltaClass(overallMove)}">${overallMove>0?'+':''}${overallMove}</b></div>${rankSpark(rank30.length?rank30:[rankBase,rankLast],'overall','Overall rank')}</div>
    <div class="vh-card"><h3 class="vh-section-heading">${esc(meta.pos)} Rank — Last 30 Days</h3><div class="vh-rank-stat"><span class="muted">#${rankBase.posRank} → #${rankLast.posRank}</span><b class="${deltaClass(posMove)}">${posMove>0?'+':''}${posMove}</b></div>${rankSpark(rank30.length?rank30:[rankBase,rankLast],'posRank',`${meta.pos} rank`)}</div>
  </div>
  <div class="vh-grid">
    <div class="vh-card" style="grid-column:span 2"><h3 class="vh-section-heading">Recent Changes</h3><div class="vh-sub">Latest recorded value or rank changes</div>${recentChanges(allPts)}</div>
    <div class="vh-card"><h3 class="vh-section-heading">All-Time Milestones</h3><div class="vh-feed">
      <div class="vh-feed-row"><span class="vh-milestone-label">High value<span class="vh-milestone-time">${highPoint?dateTime(highPoint.t):'—'}</span></span><b>${fmt(allMax)}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Low value<span class="vh-milestone-time">${lowPoint?dateTime(lowPoint.t):'—'}</span></span><b>${fmt(allMin)}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Best overall<span class="vh-milestone-time">${bestOverallPoint?dateTime(bestOverallPoint.t):'—'}</span></span><b>#${bestOverall}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Best ${esc(meta.pos)}</span><b>#${bestPos}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Lowest ${esc(meta.pos)} Rank</span><b>#${lowestPos}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Highest points in a week<span class="vh-milestone-time">${scoring?.highWeek?`${scoring.highWeek.season} Week ${scoring.highWeek.week}`:'No recorded NFL week yet'}</span></span><b>${scoring?.highWeek?Number(scoring.highWeek.points).toFixed(2):'—'}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Highest points in a season<span class="vh-milestone-time">${scoring?.highSeason?`${scoring.highSeason.season} • ${scoring.highSeason.games} games`:'No qualifying 8+ game season yet'}</span></span><b>${scoring?.highSeason?Number(scoring.highSeason.points).toFixed(2):'—'}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Highest PPG in qualifying season<span class="vh-milestone-time">${scoring?.highPpg?`${scoring.highPpg.season} • ${scoring.highPpg.games} games`:'No qualifying 8+ game season yet'}</span></span><b>${scoring?.highPpg?Number(scoring.highPpg.points).toFixed(2):'—'}</b></div>
      <div class="vh-feed-row"><span class="vh-milestone-label">Observations</span><b>${fmt(allPts.length)}</b></div>
    </div><div class="tiny muted" style="margin-top:10px">Scoring milestones use Sleeper weekly regular-season stats and this league’s scoring settings. Informational only.</div></div>
  </div>
  ${similarPlayersSection(id)}`;
}
function boot(){addShell();scheduleSnapshot(0);document.getElementById('updateBtn')?.addEventListener('click',()=>{marketCache=null;teamNetCache.clear();scheduleSnapshot(1000);if(currentPlayerId)setTimeout(()=>loadPlayer(currentPlayerId),1800)},{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.valueHistoryV331={currentRows,recordSnapshot,historyFetch,marketFetch,livePlayerMeta,periodPoints};
})();
