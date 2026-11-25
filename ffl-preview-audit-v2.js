/* FFL Preview QA v2 • safe read-only • run from Ctrl+Alt+J on a Deploy Preview */
(async()=>{
 if(!/^deploy-preview-\d+--/.test(location.hostname)){console.error('FFL audit only runs on a Netlify PR Deploy Preview. Never run this against production.');return}
 if(window.__FFL_QA_RUNNING){console.warn('FFL audit already running');return}
 window.__FFL_QA_RUNNING=true;
 const started=new Date().toISOString(),checks=[],pages={},api={},errors=[],screens={};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const text=n=>String(n?.innerText||n?.textContent||'').trim();
 const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
 const cap=(s,n=320)=>String(s||'').slice(0,n);
 const add=(area,name,status,detail='')=>checks.push({area,name,status,detail:cap(detail,700)});
 const jsonish=x=>JSON.parse(JSON.stringify(x,(k,v)=>/token|cookie|authorization|secret|password|email|access_key/i.test(k)?'[redacted]':v));
 const visible=e=>{if(!e||!e.isConnected)return false;const st=getComputedStyle(e),r=e.getBoundingClientRect();return st.display!=='none'&&st.visibility!=='hidden'&&r.width>3&&r.height>3};
 const elements=(sel,root=document)=>[...root.querySelectorAll(sel)].filter(visible);
 const appRoot=()=>document.querySelector('main')||document.body;
 const pick=(parts,root=document)=>elements('button,a,[role="tab"]',root).find(e=>parts.some(x=>norm(text(e)).toLowerCase()===x.toLowerCase()))||
  elements('button,a,[role="tab"]',root).find(e=>parts.some(x=>norm(text(e)).toLowerCase().includes(x.toLowerCase())));
 const click=async (el,ms=750)=>{if(!el)return false;el.click();await sleep(ms);return true};
 const settle=async (selector,loading,maxMs=14000)=>{
  const startedAt=Date.now();
  while(Date.now()-startedAt<maxMs){
   const box=document.querySelector(selector);
   if(box){
    const content=norm(text(box));
    if(content&&!loading.test(content)){
     return {settled:true,text:content,failed:/temporarily unavailable|failed to load|unexpected error/i.test(content)};
    }
   }
   await sleep(350);
  }
  const box=document.querySelector(selector);
  return {settled:false,text:cap(norm(text(box)),350),failed:false};
 };
 const snap=(label)=>{
  const root=appRoot(),head=elements('h1,h2,h3',root).slice(0,24).map(e=>cap(norm(text(e)),90));
  const nav=elements('[data-lh-view],[role="tab"],.tabs button',root).slice(0,30)
    .map(e=>({label:cap(norm(text(e)),60),active:e.classList.contains('active')||e.getAttribute('aria-selected')==='true'}));
  const over=elements('body *').filter(e=>{if(e.children.length>7)return false;const r=e.getBoundingClientRect();if(!(r.right>innerWidth+12&&r.width<innerWidth*2&&r.left<innerWidth))return false;for(let p=e.parentElement;p;p=p.parentElement){const st=getComputedStyle(p);if(/auto|scroll/.test(st.overflowX)&&p.scrollWidth>p.clientWidth+10)return false}return true}).slice(0,12)
    .map(e=>({tag:e.tagName,cls:cap(e.className,70),right:Math.round(e.getBoundingClientRect().right)}));
  const stuck=elements('main *').filter(e=>/loading|please wait|fetching/i.test(norm(text(e)))&&text(e).length<90).slice(0,9).map(e=>cap(text(e),85));
  const screenshot={url:location.href,headings:head,subtabs:nav,overflow:over,stuck,bodyExcerpt:cap(norm(text(root)),1100)};
  screens[label]=screenshot;
  add(label,'visible headings',head.length?'PASS':'WARN',head.join(' | '));
  add(label,'horizontal overflow',document.documentElement.scrollWidth>innerWidth+24?'WARN':'PASS',
    'document='+document.documentElement.scrollWidth+' viewport='+innerWidth);
  if(over.length)add(label,'clipped elements','WARN',JSON.stringify(over));
  if(stuck.length)add(label,'possible loading state','WARN',stuck.join('; '));
  if(/League Hub|Market|History|Awards|Managers/i.test(label)&&/current values and ranks come from player values|original finished-value and overall-rank fluctuation boards remain unchanged/i.test(text(root)))
   add(label,'removed explanatory copy','FAIL','Old Market helper text is visible');
 };
 const fetchJson=async (label,path,{timeoutMs=10000}={})=>{
  try{
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
   const r=await fetch(path,{method:'GET',cache:'no-store',credentials:'same-origin',signal:ctl.signal,headers:{Accept:'application/json'}});clearTimeout(timer);
   const type=r.headers.get('content-type')||'';
   let val=type.includes('json')?await r.json():{non_json:true,preview:(await r.text()).slice(0,90)};
   api[label]={status:r.status,ok:r.ok,url:path,topKeys:Object.keys(val||{}).slice(0,20)};
   if(!r.ok){add('API',label,'WARN','HTTP '+r.status);return null}
   add('API',label,'PASS','HTTP '+r.status);
   return val;
  }catch(e){add('API',label,'WARN',e.message);return null}
 };
 // Independently sum first-to-last changes in each recorded model segment.
 // The server-reported silent handoff timestamp is an input, not independently
 // inferred from a single player's prices. Missing boundary evidence is WARN.
 function auditRecordedMovement(points,{baseline,through,model,modelChangeAt}){
  const start=Date.parse(baseline||''),end=Date.parse(through||''),boundary=Date.parse(modelChangeAt||'');
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return null;
  const rows=(Array.isArray(points)?points:[]).filter(p=>Date.parse(p.t)>=start&&Date.parse(p.t)<=end&&p.value!=null&&Number.isFinite(Number(p.value))).sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
  if(rows.length<2||Date.parse(rows[0].t)!==start||Date.parse(rows.at(-1).t)!==end)return null;
  if(Number.isFinite(boundary)&&boundary>start&&boundary<=end&&!rows.some(p=>Date.parse(p.t)===boundary))return null;
  const groups=[];
  for(const row of rows){
   const raw=row.valuation_model||null;
   const effective=Number.isFinite(boundary)&&Date.parse(row.t)>=boundary?model:raw;
   if(Number.isFinite(boundary)&&Date.parse(row.t)>=boundary&&raw&&raw!==model)return null;
   const last=groups.at(-1);
   if(last&&last.model===effective)last.rows.push(row);else groups.push({model:effective,rows:[row]});
  }
  const segments=groups.filter(g=>g.rows.length>=2).map(g=>({model:g.model,from:g.rows[0].t,to:g.rows.at(-1).t,fromValue:Number(g.rows[0].value),toValue:Number(g.rows.at(-1).value),delta:Number(g.rows.at(-1).value)-Number(g.rows[0].value)}));
  if(!segments.length)return null;
  return {delta:segments.reduce((n,g)=>n+g.delta,0),segments};
 }
 function auditHotSeat(teams,record){
  const rows=Array.isArray(teams)?teams:[];
  const complete=rows.length===32&&new Set(rows.map(t=>String(t.roster_id))).size===32&&rows.every(t=>t.projection_coverage===1&&[t.projected,t.opponent_projected,t.points,t.opponent_points].every(v=>v!=null&&Number.isFinite(Number(v))));
  const expected=complete?rows.filter(t=>t.won===false&&Number(t.points)<Number(t.opponent_points)&&Number(t.projected)>Number(t.opponent_projected)).sort((a,b)=>(Number(b.projected)-Number(b.opponent_projected))-(Number(a.projected)-Number(a.opponent_projected))||String(a.roster_id).localeCompare(String(b.roster_id)))[0]:null;
  const badges=(record?.manager_awards||[]).filter(a=>a.type==='hot-seat');
  const recorded=badges[0]||null;
  const matches=complete&&!!record&&badges.length===(expected?1:0)&&(!expected||String(expected.roster_id)===String(recorded?.roster_id));
  return {complete,matches,teamCount:rows.length,covered:rows.filter(t=>t.projection_coverage===1&&t.projected!=null&&t.opponent_projected!=null).length,expected:expected?{roster_id:expected.roster_id,team:expected.team_name,projected_margin:Number(expected.projected)-Number(expected.opponent_projected)}:null,recorded:recorded?{roster_id:recorded.roster_id,team:recorded.team_name,provisional:!!recorded.provisional}:null};
 }
 const consoleError=(type,...args)=>{errors.push({type,message:cap(args.map(x=>typeof x==='string'?x:x?.message||String(x)).join(' '),350)})};
 const prevError=console.error,prevWarn=console.warn,onError=e=>consoleError('window',e.message),onRejection=e=>consoleError('rejection',e.reason?.message||e.reason);
 console.error=function(...args){consoleError('console',...args);prevError.apply(this,args)};
 console.warn=function(...args){consoleError('warning',...args);prevWarn.apply(this,args)};
 window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);
 try{
  add('Environment','host',/deploy-preview-\d+--/.test(location.hostname)?'PASS':'WARN',location.hostname);
  add('Environment','viewport','INFO',innerWidth+'×'+innerHeight+' DPR '+devicePixelRatio);
  add('Environment','expected JS assets', [...document.scripts].some(s=>/trade-value-normalization-v139\.js\?v=142/.test(s.src))?'PASS':'FAIL','pick normalizer ?v=142');
  for(const [label,file,min] of [['League Hub key','league-hub-v451.js',566],['Value History key','value-history-v276.js',553]]){
   const versions=[...document.scripts].map(s=>new URL(s.src||location.href)).filter(u=>u.pathname.endsWith('/'+file)).map(u=>Number(u.searchParams.get('v')));
   add('Environment',label,versions.length===1&&versions[0]>=min?'PASS':'FAIL',JSON.stringify({file,versions,minimum:min}));
  }
  snap('Initial page');
  if(document.querySelector('#vhScoringMilestones')&&/Christian McCaffrey/i.test(document.body.innerText)){
    await sleep(1600);
    const milestone=norm(text(document.querySelector('#vhScoringMilestones')));
    api.cmcRenderedMilestones=cap(milestone,1100);
    add('Badges','McCaffrey 2026 Week 10 visually rendered',
      /2026\s*Week\s*10/i.test(milestone)?'PASS':'WARN',
      cap(milestone,500));
  }
  const menu=['HOME','TRADE FINDER','TRADE EVALUATOR','TRADE HISTORY','PLAYER VALUES','VALUE HISTORY','LEAGUE HUB'];
  for(const name of menu){
   const nav=pick([name],document.querySelector('header')||document);
   if(!nav){add('Navigation',name,'WARN','Navigation target not visible');continue}
   await click(nav,1000);
   // Keep the first page navigation snapshot after the async page has settled.
   // A 1-second loading placeholder is not proof of a stalled application.
   if(name==='LEAGUE HUB')await settle('#leagueHubContent',/^Loading league intelligence…$/,14000);
   snap(name);
   pages[name]={headings:screens[name].headings,excerpt:screens[name].bodyExcerpt};
   add('Navigation',name,/error|failed to load|undefined is not|something went wrong/i.test(text(appRoot()).slice(0,260))?'WARN':'PASS',cap(text(appRoot()),170));
   if(name==='PLAYER VALUES'){
    // Select the Draft Picks subsection. Comparing the ALL player list with
    // Draft Picks as one array creates a false discontinuity around row 579.
    const draftTab=document.querySelector('[data-value-filter="DRAFT"]');
    if(!draftTab){add('Draft picks','dedicated Draft Picks filter','FAIL','Cannot locate data-value-filter=DRAFT');}
    else{
     await click(draftTab,500);
     const pickNodes=elements('#playerValuesBody .asset');
     const picks=pickNodes.map(row=>{
      const label=norm(text(row)),m=label.match(/\b(20\d{2})\s+R([123])\b/i),v=label.match(/\bValue\s*([\d,]+)/i);
      return m&&v?{year:Number(m[1]),round:Number(m[2]),value:Number(v[1].replace(/,/g,'')),label:cap(label,115)}:null;
     }).filter(Boolean);
     pages.pickSamples=picks.slice(0,55);
     add('Draft picks','dedicated Draft Picks list populated',picks.length?'PASS':'FAIL','Recognized '+picks.length+' pick rows / '+pickNodes.length+' visible rows');
     if(picks.length>1){
      const wrong=picks.flatMap((p,i)=>i&&p.value>picks[i-1].value?[{row:i+1,previous:picks[i-1],current:p}]:[]);
      add('Draft picks','descending canonical displayed values',wrong.length?'FAIL':'PASS',
       JSON.stringify({total:picks.length,first:picks.slice(0,6),wrong:wrong.slice(0,8)}));
      for(const round of [1,2,3]){
       const yearTop={};
       picks.filter(x=>x.round===round).forEach(x=>{yearTop[x.year]=Math.max(yearTop[x.year]||0,x.value)});
       const years=Object.keys(yearTop).map(Number).sort((a,b)=>a-b);
       const wrongYears=years.slice(1).filter((y,i)=>yearTop[y]>yearTop[years[i]]);
       add('Draft picks','round '+round+' year-to-year cap',years.length<2?'WARN':wrongYears.length?'WARN':'PASS',
        JSON.stringify({years:years.map(y=>({year:y,highest:yearTop[y]})),violations:wrongYears}));
      }
     }else add('Draft picks','descending canonical displayed values','WARN','Insufficient rendered pick rows');
     // A horizon cap that makes 2029 equal to 2028 is not a year-by-year discount.
     const bySlot=new Map();
     for(const p of picks){
      const slot=p.label.match(/projected\s+(\d)\.(\d{2})/i);
      if(slot)bySlot.set(p.year+'|'+p.round+'|'+Number(slot[2]),p.value);
     }
     const equalYears=[];
     for(const p of picks.filter(p=>p.year===2029&&p.round===1)){
      const slot=p.label.match(/projected\s+(\d)\.(\d{2})/i);
      if(!slot)continue;
      const prev=bySlot.get('2028|'+p.round+'|'+Number(slot[2]));
      if(Number.isFinite(prev)&&p.value>=prev)equalYears.push({
        projected:p.round+'.'+slot[2],year2028:prev,year2029:p.value
      });
     }
     add('Draft picks','2029 round 1 strictly discounted versus 2028 same projected slot',
       equalYears.length?'FAIL':'PASS',JSON.stringify(equalYears.slice(0,12)));
     const allTab=document.querySelector('[data-value-filter="ALL"]');
     if(allTab)await click(allTab,220);
    }
    // Open the actual McCaffrey profile to validate rendered milestones, rather
    // than assuming a successful canonical API record equals a visible badge.
    const search=document.querySelector('#allValueSearch');
    if(search){
     search.value='Christian McCaffrey';
     search.dispatchEvent(new Event('input',{bubbles:true}));
     await sleep(250);
     const history=document.querySelector('[data-pv-history="4034"]');
     if(history){
      await click(history,950);
      let rendered='',loaded=false;
      for(let t=0;t<100;t++){
       const node=document.querySelector('#vhScoringMilestones');
       rendered=norm(text(node));
       const complete=/2026\s*Week\s*10/i.test(rendered)&&
         (rendered.match(/Top Offensive Scorer/g)||[]).length>=5;
       if(node&&complete){loaded=true;break}
       await sleep(550);
      }
      api.cmcRenderedMilestones=cap(rendered,1400);
      const hasWeek10=/2026\s*Week\s*10/i.test(rendered);
      const count=(rendered.match(/Top Offensive Scorer/g)||[]).length;
      const pending=/Loading completed-week scoring/i.test(rendered);
      add('Badges','McCaffrey Week 10 visibly rendered',
       hasWeek10?'PASS':pending?'WARN':'FAIL',cap(rendered,600));
      add('Badges','McCaffrey historical wins displayed',
       count>=5?'PASS':'FAIL','Visible offensive scoring milestones: '+count+
       (loaded?' (verified settled)':''));
     }else add('Badges','McCaffrey profile link','WARN','Search did not render Sleeper player 4034');
     const navBack=pick(['PLAYER VALUES'],document.querySelector('header')||document);
     if(navBack)await click(navBack,380);
    }
   }
   if(name==='VALUE HISTORY'){
    const choices=['Market Dashboard','Player Value History','Full Market Value History','Track my team','Team Value History'];
    for(const choice of choices){
     const tab=pick([choice],appRoot());if(!tab)continue;
     await click(tab,850);
     if(choice==='Market Dashboard'){
      const result=await settle('#vhContent',/^Loading market dashboard…$/,18000);
      const loaded=/Market Intelligence|Value Risers|Risers|Fallers|Market Heat Map/i.test(result.text);
      add('Market','selected Market Dashboard finishes loading',
       result.failed?'FAIL':loaded?'PASS':result.settled?'WARN':'WARN',
       cap(result.text,360));
      add('Market','mover panels',loaded?'PASS':'WARN',
       loaded?'Market content rendered after settled fetch':'Market data still loading or unavailable after wait');
     }
     snap('History: '+choice);
    }
   }
   if(name==='LEAGUE HUB'){
    const root=appRoot(),tabNames=['Fleeced Daily','Awards','Hall of Fleeced','Managers'];
    for(const tabName of tabNames){
     const el=pick([tabName],root);
     if(!el){add('League Hub',tabName,'WARN','Tab absent');continue}
     await click(el,1250);
     const settled=await settle('#leagueHubContent',/^Loading league intelligence…$/,14000);
     add('League Hub',tabName+' settles after navigation',
       settled.failed?'FAIL':settled.settled?'PASS':'WARN',cap(settled.text,280));
     snap('Hub: '+tabName);
     if(tabName==='Fleeced Daily'){
      const picker=()=>document.querySelector('#leagueHubContent [data-lh-daily-week]');
      const scoreboard=()=>{const h=elements('#leagueHubContent h3').find(n=>/Completed Week Results/i.test(text(n)));return norm(text(h?.closest('.lh-card')))};
      const options=[...(picker()?.options||[])],historical=options[2];
      add('League Hub','Daily week filter offers completed weeks',picker()&&historical?'PASS':'FAIL',JSON.stringify(options.map(o=>({value:o.value,label:text(o)}))));
      if(historical){
       const original=scoreboard(),select=picker(),label=text(historical);
       select.value=historical.value;select.dispatchEvent(new Event('change',{bubbles:true}));
       await settle('#leagueHubContent',/^Loading league intelligence…$/,25000);
       const chosen=scoreboard();
       add('League Hub','Daily historical week selects exact results',picker()?.value===historical.value&&chosen.includes(label)?'PASS':'FAIL',cap(chosen,240));
       const reset=picker();
       if(reset){reset.value='latest';reset.dispatchEvent(new Event('change',{bubbles:true}));await settle('#leagueHubContent',/^Loading league intelligence…$/,25000);}
       add('League Hub','Daily latest-week restore',picker()?.value==='latest'&&scoreboard()===original?'PASS':'FAIL',cap(scoreboard(),240));
      }
     }
     if(tabName==='Managers'){
      const body=norm(text(document.querySelector('#leagueHubContent')));
      add('Managers','Manager Spotlight present',
        /MANAGER SPOTLIGHT/i.test(body)?'PASS':'FAIL',cap(body,280));
      add('Managers','Current Managers and Graveyard loaded',
        /CURRENT MANAGERS/i.test(body)&&/GRAVEYARD/i.test(body)?'PASS':'WARN',
        cap(body,240));
     }
     if(tabName==='Awards'){
      const visibleAwards=norm(text(document.querySelector('#leagueHubContent')));
      // Do not count introductory helper text mentioning Hot Seat: require an
      // actual rendered weekly award card heading.
      const hotSeatCards=elements('#leagueHubContent .lh-card h3').filter(h=>
       /^\s*(?:🔥\s*)?HOT SEAT\s*$/i.test(norm(text(h))));
      const displayedWeek=visibleAwards.match(/WEEKLY MANAGER AWARDS\s*[—-]\s*(\d{4}) WEEK (\d+)/i);
      api.displayedManagerAwards={season:Number(displayedWeek?.[1])||null,week:Number(displayedWeek?.[2])||null,hotSeatCards:hotSeatCards.length,hotSeatText:hotSeatCards.map(h=>norm(text(h.closest('.lh-card')))),provisional:/Current verified result, pending archival/i.test(visibleAwards)};
      add('League Hub','Current weekly awards heading rendered',
        displayedWeek?'PASS':'FAIL',
        JSON.stringify({displayedWeek:api.displayedManagerAwards,renderedHotSeatCards:hotSeatCards.length,
          headingSamples:elements('#leagueHubContent .lh-card h3').slice(0,7).map(x=>cap(text(x),55))}));
      const body=norm(text(document.querySelector('#leagueHubContent')));
      const selected=elements('[data-lh-view].active',root)
       .some(node=>node.getAttribute('data-lh-view')==='awards');
      add('League Hub','Awards retained after async navigation',
       !selected||/Fleeced! Daily\s*—\s*Completed Week Results/i.test(body.slice(0,350))?'FAIL':
       /WEEKLY MANAGER AWARDS|THE FLEECER|HOT SEAT/i.test(body)?'PASS':'WARN',
       cap(body,220));
     }
    }
    // Stress the former stale-response race. Avoid clicking mutation controls.
    for(const name of ['Fleeced Daily','Awards','Hall of Fleeced','Awards']){
     const el=pick([name],root);if(el)el.click();
     await sleep(90);
    }
    await sleep(1400);
    snap('Hub: rapid tab switch');
    const active=elements('[data-lh-view].active',root).map(e=>e.getAttribute('data-lh-view'));
    add('League Hub','rapid tab: Awards remains selected',active.includes('awards')?'PASS':'WARN',JSON.stringify(active));
   }
  }
  // Read-only endpoints: no UPDATE button, POST, mutations, form submissions, or schedule triggers.
  const [awards,latest,highs,managers,market]=await Promise.all([
   fetchJson('weekly awards','/.netlify/functions/league-hub?weekly_awards=1'),
   fetchJson('completed week','/.netlify/functions/league-hub?league_latest=1'),
   fetchJson('All-Time Highs','/.netlify/functions/league-hub?award_highs=1'),
   fetchJson('Managers','/.netlify/functions/league-hub?managers=1'),
   fetchJson('Market snapshots','/.netlify/functions/value-history?market=1')
  ]);
  const records=awards?.records||awards?.weekly_awards?.records||[];
  const latestAward=Array.isArray(records)?records.find(r=>Number(r.season)===Number(latest?.season)&&Number(r.week)===Number(latest?.week)):null;
  const sourceTeams=latest?.available?latest.teams||[]:[];
  const latestHot=auditHotSeat(sourceTeams,latestAward);
  const visible=api.displayedManagerAwards,correctWeek=visible?.season===Number(latest?.season)&&visible?.week===Number(latest?.week);
  const shown=correctWeek&&(latestHot.expected?visible.hotSeatCards===1&&visible.hotSeatText.some(v=>v.toLowerCase().includes(String(latestHot.expected.team||'').toLowerCase())):visible.hotSeatCards===0);
  api.latestHotSeatComparison={...latestHot,correctWeek,shown};
  add('Weekly','Latest completed-week Hot Seat exact winner and display parity',
   !latestHot.complete?'WARN':latestHot.matches&&shown?'PASS':'FAIL',JSON.stringify(api.latestHotSeatComparison));
  if(Number(latest?.week)>1){
   const priorWeek=Number(latest.week)-1;
   const historic=await fetchJson('Previous completed week matchups','/.netlify/functions/league-hub?league_week='+priorWeek);
   const historicalTeams=historic?.available&&Number(historic.week)===priorWeek?historic.teams||[]:[];
   const historicalRecord=records.find(r=>Number(r.season)===Number(latest.season)&&Number(r.week)===priorWeek);
   const priorHot=auditHotSeat(historicalTeams,historicalRecord);
   api.previousHotSeatComparison={...priorHot,season:latest.season,week:priorWeek};
   add('Weekly','Historical Hot Seat exact winner and projection evidence',!priorHot.complete?'WARN':priorHot.matches?'PASS':'FAIL',JSON.stringify(api.previousHotSeatComparison));
  }
  api.weeklyRecordSummary=Array.isArray(records)?records.slice(-8).map(r=>({
   season:r.season,week:r.week,offense:r.players_of_week?.offense||r.players_of_week?.offensive||null,
   idp:r.players_of_week?.defense||r.players_of_week?.idp||null,source:r.award_source
  })):null;
  const ten=Array.isArray(records)?records.find(r=>Number(r.season)===2026&&Number(r.week)===10):null;
  const cmcWinner=ten?.players_of_week?.offense||ten?.players_of_week?.offensive;
  add('Badges','Week 10 McCaffrey canonical result',
   String(cmcWinner?.player_id||'')==='4034'&&Number(cmcWinner?.points)===46.3?'PASS':'FAIL',
   JSON.stringify({id:cmcWinner?.player_id,points:cmcWinner?.points}));
  const history=await fetchJson('McCaffrey scoring milestones',
   '/.netlify/functions/value-history?player_scoring=1&player_id=4034',{timeoutMs:45000});
  const badges=history?.scoring_milestones?.weeklyAwards;
  api.cmcMilestoneBadgeSummary=Array.isArray(badges)?badges.map(b=>({season:b.season,week:b.week,points:b.points,type:b.type})):null;
  const matched=Array.isArray(badges)&&badges.some(b=>Number(b.season)===2026&&Number(b.week)===10);
  const serverHasBoth=Array.isArray(badges)&&[6,10].every(week=>
    badges.some(b=>Number(b.season)===2026&&Number(b.week)===week&&
      Number(b.points)===(week===10?46.3:30.7)));
  add('Badges','Server milestones independently include Week 10',
   !history?'WARN':matched?'PASS':'FAIL',
   !history?'Server request unavailable; rerun authenticated audit':JSON.stringify({total:badges?.length,recent:api.cmcMilestoneBadgeSummary?.slice(0,8)}));
  add('Badges','Server milestone completeness (separate from browser rendering)',
   !history?'WARN':serverHasBoth&&badges.length>=5?'PASS':'FAIL',
   Array.isArray(badges)?'Server returned '+badges.length+' badges':'Not measured');
  const visual=String(api.cmcRenderedMilestones||'');
  add('Badges','2026 weekly badge date provenance',
   /2026 Week (6|10) • date unavailable/i.test(visual)?'WARN':'PASS',
   /date unavailable/i.test(visual)?'Verify saved week-start dates from server readback':'2026 weekly badges show recorded or derived week dates');
  // Read the scheduler-specific timestamp, not a truncated player page or
  // the latest snapshot (which could be a manual or page-load observation).
  const observation=await fetchJson('Scheduled Value History observability','/.netlify/functions/value-history-observability');
  const scheduledText=observation?.last_scheduled||null;
  const scheduledMs=Date.parse(scheduledText||'');
  const ageMinutes=Number.isFinite(scheduledMs)?(Date.now()-scheduledMs)/60000:null;
  const fresh=observation?.ok===true&&Number.isFinite(ageMinutes)&&ageMinutes>=0&&ageMinutes<=240;
  api.scheduledHistory={scheduledText,ageMinutes,archiveSnapshotCount:observation?.archive_snapshot_count??null};
  add('History','Scheduled observation freshness',fresh?'PASS':'WARN',JSON.stringify({...api.scheduledHistory,maximumMinutes:240}));
  api.completedWeek={season:latest?.season,week:latest?.week,available:latest?.available,teams:latest?.teams?.length};
  add('Weekly','completed Sleeper matchup coverage',latest?.available&&latest?.teams?.length===32?'PASS':'WARN',JSON.stringify(api.completedWeek));
  api.highsSummary={keys:Object.keys(highs||{}),recordCount:highs?.records?.length};
  add('All-Time Highs','archived high records present',
   !highs?'WARN':(highs.records?.length||0)>0?'PASS':'WARN',
   JSON.stringify({recordCount:highs?.records?.length,source:highs?.sources,cache:highs?.cache_status}).slice(0,550));
  add('All-Time Highs','independent GitHub historical archive populated',
   !highs?'WARN':Number(highs.sources?.durable)>0&&Number(highs.sources?.independently_verified)>0&&highs.verified_records?.length>0?'PASS':'WARN',
   'Blob records: '+String(highs?.sources?.blob??'n/a')+
   ' | durable GitHub records: '+String(highs?.sources?.durable??'n/a')+
   ' | independently verified: '+String(highs?.sources?.independently_verified??'n/a')+'. Legacy scores are not certified peaks.');
  api.managerSummary={keys:Object.keys(managers||{}),currentManagers:managers?.current?.length};
  add('Managers','all 32 league managers mapped',managers?.current?.length===32?'PASS':'WARN',
   'Managers found: '+String(managers?.current?.length??'unavailable'));
  api.marketSummary={keys:Object.keys(market||{}),snapshotCount:market?.snapshot_count??market?.snapshotCount};
  const currentMarket=market?.market||market;
  const moving=currentMarket?.periods?.['7D'];
  const candidate=[...(moving?.valueRisers||[]),...(moving?.valueFallers||[])].find(row=>String(row?.id)==='8343');
  const mafeRow=currentMarket?.marketRows?.find(row=>String(row.id)==='8343');
  const mafeHistory=await fetchJson('Boye Mafe recorded history','/.netlify/functions/value-history?player_id=8343',{timeoutMs:45000});
  const evidence=auditRecordedMovement(mafeHistory?.points,{baseline:candidate?.baseline_t,through:candidate?.through_t||currentMarket?.latest,model:currentMarket?.valuation_model,modelChangeAt:currentMarket?.model_change_at});
  api.boyeMafe7DModelAudit={value:mafeRow?.value,delta:candidate?.delta??null,model:currentMarket?.valuation_model,
   modelChangeAt:currentMarket?.model_change_at,baseline:candidate?.baseline_t,through:candidate?.through_t||currentMarket?.latest,evidence};
  const comparable=!!candidate&&!!evidence&&!mafeHistory?.partial;
  const movementMatched=comparable&&Number(candidate.delta)===evidence.delta&&Number(mafeRow?.delta7)===evidence.delta;
  add('Market','Boye Mafe 7D recorded segment arithmetic',
   !comparable?'WARN':movementMatched?'PASS':'FAIL',JSON.stringify(api.boyeMafe7DModelAudit));
  // Only inspect; actual live Market values must still be compared against the immutable archive.
  add('Data provenance','Market history coverage','INFO',JSON.stringify(api.marketSummary));
 }catch(e){add('Script','runner','FAIL',e.stack||e.message)}
 finally{
  console.error=prevError;console.warn=prevWarn;
  window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection);
  window.__FFL_QA_RUNNING=false;
  const summary={pass:checks.filter(x=>x.status==='PASS').length,fail:checks.filter(x=>x.status==='FAIL').length,warn:checks.filter(x=>x.status==='WARN').length};
  const report=jsonish({audit:'FFL Preview read-only visual/function audit v2',started,finished:new Date().toISOString(),location:location.origin,viewport:{width:innerWidth,height:innerHeight},summary,checks,pages,api,errors:errors.slice(0,65),screens});
  window.__FFL_QA_REPORT=report;
  console.group('%cFFL QA AUDIT — '+summary.pass+' passed / '+summary.fail+' failed / '+summary.warn+' warnings','color:#f4be30;font-size:17px');
  console.table(checks);console.log('Complete report:',report);console.groupEnd();
  try{
   const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ffl-preview-audit-'+Date.now()+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000);
  }catch(e){console.warn('Report download blocked; run copy(JSON.stringify(__FFL_QA_REPORT))')}
  console.info('Send the downloaded JSON to ChatGPT. For screenshot appearance, also attach 3–5 viewport captures of any flagged areas.');
 }
})();