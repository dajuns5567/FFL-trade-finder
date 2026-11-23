/* FFL Preview QA v1 • safe read-only • run from Ctrl+Alt+J on a Deploy Preview */
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
 const fetchJson=async (label,path)=>{
  try{
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
   const r=await fetch(path,{method:'GET',cache:'no-store',credentials:'same-origin',signal:ctl.signal,headers:{Accept:'application/json'}});clearTimeout(timer);
   const type=r.headers.get('content-type')||'';
   let val=type.includes('json')?await r.json():{non_json:true,preview:(await r.text()).slice(0,90)};
   api[label]={status:r.status,ok:r.ok,url:path,topKeys:Object.keys(val||{}).slice(0,20)};
   if(!r.ok){add('API',label,'WARN','HTTP '+r.status);return null}
   add('API',label,'PASS','HTTP '+r.status);
   return val;
  }catch(e){add('API',label,'WARN',e.message);return null}
 };
 const consoleError=(type,...args)=>{errors.push({type,message:cap(args.map(x=>typeof x==='string'?x:x?.message||String(x)).join(' '),350)})};
 const prevError=console.error,prevWarn=console.warn,onError=e=>consoleError('window',e.message),onRejection=e=>consoleError('rejection',e.reason?.message||e.reason);
 console.error=function(...args){consoleError('console',...args);prevError.apply(this,args)};
 console.warn=function(...args){consoleError('warning',...args);prevWarn.apply(this,args)};
 window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);
 try{
  add('Environment','host',/deploy-preview-\d+--/.test(location.hostname)?'PASS':'WARN',location.hostname);
  add('Environment','viewport','INFO',innerWidth+'×'+innerHeight+' DPR '+devicePixelRatio);
  add('Environment','expected JS assets', [...document.scripts].some(s=>/trade-value-normalization-v139\.js\?v=142/.test(s.src))?'PASS':'FAIL','pick normalizer ?v=142');
  add('Environment','League Hub key', [...document.scripts].some(s=>/league-hub-v451\.js\?v=557/.test(s.src))?'PASS':'FAIL','Hall and tab fixes ?v=557');
  add('Environment','Value History key', [...document.scripts].some(s=>/value-history-v276\.js\?v=550/.test(s.src))?'PASS':'FAIL','history ?v=550');
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
      for(let t=0;t<10;t++){
       const node=document.querySelector('#vhScoringMilestones');
       rendered=norm(text(node));
       if(node&&(/2026\s*Week\s*10/i.test(rendered)||/Top Offensive Scorer/i.test(rendered))){loaded=true;break}
       await sleep(550);
      }
      api.cmcRenderedMilestones=cap(rendered,1400);
      const hasWeek10=/2026\s*Week\s*10/i.test(rendered);
      add('Badges','McCaffrey Week 10 visibly rendered',hasWeek10?'PASS':loaded?'FAIL':'WARN',cap(rendered,600));
      const count=(rendered.match(/Top Offensive Scorer/g)||[]).length;
      add('Badges','McCaffrey historical wins displayed',count>=5?'PASS':'WARN','Visible offensive scoring milestones: '+count);
     }else add('Badges','McCaffrey profile link','WARN','Search did not render Sleeper player 4034');
     const navBack=pick(['PLAYER VALUES'],document.querySelector('header')||document);
     if(navBack)await click(navBack,380);
    }
   }
   if(name==='VALUE HISTORY'){
    const choices=['Market Dashboard','Player Value History','Full Market Value History','Track my team','Team Value History'];
    for(const choice of choices){const tab=pick([choice],appRoot());if(tab){await click(tab,850);snap('History: '+choice)}}
    const rows=norm(text(appRoot()));
    if(/Market Movers|Risers|Fallers/i.test(rows))add('Market','mover panels','PASS','Market content rendered');
    else add('Market','mover panels','WARN','Search separate Market Dashboard tab');
   }
   if(name==='LEAGUE HUB'){
    const root=appRoot(),tabNames=['Fleeced Daily','Awards','Hall of Fleeced','Managers'];
    for(const tabName of tabNames){
     const el=pick([tabName],root);
     if(!el){add('League Hub',tabName,'WARN','Tab absent');continue}
     await click(el,1250);snap('Hub: '+tabName);
     if(tabName==='Awards'){
      const body=norm(text(root));
      add('League Hub','Awards retained after async navigation',/Fleeced! Daily\s*—\s*Completed Week Results/i.test(body.slice(0,350))?'FAIL':'PASS',cap(body,220));
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
  api.weeklyRecordSummary=Array.isArray(records)?records.slice(-8).map(r=>({
   season:r.season,week:r.week,offense:r.players_of_week?.offense||r.players_of_week?.offensive||null,
   idp:r.players_of_week?.idp||null,source:r.award_source
  })):null;
  const ten=Array.isArray(records)?records.find(r=>Number(r.season)===2026&&Number(r.week)===10):null;
  const cmcWinner=ten?.players_of_week?.offense||ten?.players_of_week?.offensive;
  add('Badges','Week 10 McCaffrey canonical result',
   String(cmcWinner?.player_id||'')==='4034'&&Number(cmcWinner?.points)===46.3?'PASS':'FAIL',
   JSON.stringify({id:cmcWinner?.player_id,points:cmcWinner?.points}));
  const history=await fetchJson('McCaffrey scoring milestones',
   '/.netlify/functions/value-history?player_scoring=1&player_id=4034');
  const badges=history?.scoring_milestones?.weeklyAwards;
  api.cmcMilestoneBadgeSummary=Array.isArray(badges)?badges.map(b=>({season:b.season,week:b.week,points:b.points,type:b.type})):null;
  const matched=Array.isArray(badges)&&badges.some(b=>Number(b.season)===2026&&Number(b.week)===10);
  add('Badges','Server milestones independently include Week 10',
   !history?'INFO':matched?'PASS':'WARN',
   !history?'Server request timed out or failed; not evidence of missing award':JSON.stringify({total:badges?.length,recent:api.cmcMilestoneBadgeSummary?.slice(0,8)}));
  add('Badges','Server milestone count',
   !Array.isArray(badges)?'INFO':badges.length>3?'PASS':'WARN',
   Array.isArray(badges)?'Server returned '+badges.length+' badges':'Not measured');
  api.completedWeek={season:latest?.season,week:latest?.week,available:latest?.available,teams:latest?.teams?.length};
  add('Weekly','completed Sleeper matchup coverage',latest?.available&&latest?.teams?.length===32?'PASS':'WARN',JSON.stringify(api.completedWeek));
  api.highsSummary={keys:Object.keys(highs||{}),recordCount:highs?.records?.length};
  add('All-Time Highs','archived high records present',
   !highs?'WARN':(highs.records?.length||0)>0?'PASS':'WARN',
   JSON.stringify({recordCount:highs?.records?.length,source:highs?.sources,cache:highs?.cache_status}).slice(0,550));
  api.managerSummary={keys:Object.keys(managers||{}),currentManagers:managers?.current?.length};
  add('Managers','all 32 league managers mapped',managers?.current?.length===32?'PASS':'WARN',
   'Managers found: '+String(managers?.current?.length??'unavailable'));
  api.marketSummary={keys:Object.keys(market||{}),snapshotCount:market?.snapshot_count??market?.snapshotCount};
  // Only inspect; real historical accuracy needs archive-versus-displayed-value reconciliation.
  add('Data provenance','Market history coverage','INFO',JSON.stringify(api.marketSummary));
 }catch(e){add('Script','runner','FAIL',e.stack||e.message)}
 finally{
  console.error=prevError;console.warn=prevWarn;
  window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection);
  window.__FFL_QA_RUNNING=false;
  const summary={pass:checks.filter(x=>x.status==='PASS').length,fail:checks.filter(x=>x.status==='FAIL').length,warn:checks.filter(x=>x.status==='WARN').length};
  const report=jsonish({audit:'FFL Preview read-only visual/function audit v1',started,finished:new Date().toISOString(),location:location.origin,viewport:{width:innerWidth,height:innerHeight},summary,checks,pages,api,errors:errors.slice(0,65),screens});
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