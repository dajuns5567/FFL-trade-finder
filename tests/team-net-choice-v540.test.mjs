import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const playerUI=read('ui-player-values-v139.js'),valueUI=read('value-history-v276.js');
const style=read('team-net-choice-v540.css'),site=read('netlify/functions/site-v29.mjs');
test('Player Values explanatory text is gone without changing heading or search controls',()=>{
 assert.doesNotMatch(playerUI,/Player Value uses the canonical 100/);
 assert.match(playerUI,/<h2>Player Values<\/h2>/);
 assert.match(playerUI,/id="allValueSearch"/);
 assert.match(playerUI,/playerValueFilter/);
});
test('32-team net-value table makes every original team name selectable, keeping sorting and values',()=>{
 assert.match(valueUI,/all\.map\(t=>`<div class="vh-team-net-row"/);
 assert.match(valueUI,/data-vh-team-net-menu="\$\{esc\(t\.id\)\}"/);
 assert.match(valueUI,/\$\{esc\(t\.name\)\}<span aria-hidden="true">/);
 assert.match(valueUI,/\$\{fmt\(t\.value\)\}/);
 assert.match(valueUI,/data-vh-team-net-sort/);
 assert.match(valueUI,/data-vh-team-net-all/);
});
test('team popup offers value history, filtered trade history, and cancel, all with safe large targets',()=>{
 for(const v of ['Team Value History','Trade History','Cancel — back to comparison'])
  assert.ok(valueUI.includes(v),'missing option '+v);
 for(const attr of ['data-vh-team-net-choice="values"','data-vh-team-net-choice="trades"','data-vh-team-net-choice="cancel"'])
  assert.ok(valueUI.includes(attr));
 assert.match(style,/min-height:46px/);
 assert.match(style,/@media\(max-width:700px\)/);
 assert.match(site,/team-net-choice-v540\.css\?v=540/);
 assert.match(site,/value-history-v276\.js\?v=540/);
 assert.match(site,/ui-player-values-v139\.js\?v=540/);
});
test('choice logic sends value and trades to existing filtered routes; cancel retains comparison',()=>{
 const a=valueUI.indexOf('function openTeamNetChoice(teamId){');
 const b=valueUI.indexOf('function openTeamNetModal(){',a);
 assert.ok(a>0&&b>a);
 const code=valueUI.slice(a,b);
 let overlay=null,modalRemoved=0,trackOpened=0,tradeId='',teamId='',focused=false;
 const modal={
  appendChild(el){overlay=el},
  querySelector(selector){
   if(selector==='.vh-team-net-choice-overlay')return overlay;
   if(selector==='[data-vh-team-net-menu]')return {focus(){focused=true}};
   return null;
  }
 };
 const ctx={
  document:{
   getElementById:id=>id==='vhMoverModal'?modal:null,
   querySelector:selector=>selector==='#vhMoverModal .vh-team-net-choice-overlay'?overlay:
      selector==='#vhMoverModal [data-vh-team-net-menu]'?{focus(){focused=true}}:null,
   createElement:()=>({
    className:'',innerHTML:'',
    remove(){overlay=null},
    querySelector:()=>({focus(){focused=true}})
   })
  },
  currentTeamNetStandings:()=>[{id:'17',name:'Philadelphia Eagles'}],
  esc:s=>String(s),
  closeMoverModal(){modalRemoved++;overlay=null},
  renderTrackMyTeam(){trackOpened++},
  openTradeHistoryTab(id){tradeId=id},
  trackedTeamId:null,
 };
 runInNewContext(code,ctx);
 ctx.openTeamNetChoice('17');
 assert.match(overlay.innerHTML,/Philadelphia Eagles/);
 assert.match(overlay.innerHTML,/data-vh-team-net-id="17"/);
 ctx.useTeamNetChoice('cancel');
 assert.equal(overlay,null);
 assert.equal(modalRemoved,0,'cancel must not close the underlying table');
 ctx.openTeamNetChoice('17');
 ctx.useTeamNetChoice('values','17');
 assert.equal(ctx.trackedTeamId,'17');
 assert.equal(trackOpened,1);
 assert.equal(modalRemoved,1);
 ctx.openTeamNetChoice('17');
 ctx.useTeamNetChoice('trades','17');
 assert.equal(tradeId,'17');
 assert.equal(modalRemoved,2);
 assert.equal(ctx.useTeamNetChoice('trades','nonexistent'),undefined);
 assert.equal(modalRemoved,2,'unrecognized IDs cannot navigate');
});
test('existing delegated value-history click dispatcher owns all team choice actions',()=>{
 assert.match(valueUI,/const teamNetChoice=e\.target\.closest\('\[data-vh-team-net-choice\]'\)/);
 assert.match(valueUI,/const teamNetMenu=e\.target\.closest\('\[data-vh-team-net-menu\]'\)/);
 assert.match(valueUI,/tradeTeamFilter=String\(teamId\)/);
 assert.match(valueUI,/trackedTeamId=id;\s*renderTrackMyTeam\(\)/);
 assert.match(valueUI,/renderTrackMyTeam\(\)[\s\S]*?if\(selected\)loadTrackedTeam\(\)/);
});
