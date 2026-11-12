import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../fleeced-header-v512.js',import.meta.url),'utf8');
const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
const from=src.indexOf('function positionMenu(){'),to=src.indexOf('function install(){',from);
assert.ok(from>=0&&to>from);
const fragment=src.slice(from,to);
function fixture(){
 const listeners={},menuListeners={};
 const menu={classList:{open:false,add(v){if(v==='open')this.open=true},remove(v){if(v==='open')this.open=false},contains(v){return v==='open'&&this.open}},
 style:{},scrollHeight:210,getBoundingClientRect:()=>({width:230,height:210}),
 innerHTML:''};
 const tabs=['tradeHistory','rankings','valueHistory','leagueHub','finder'].map(tab=>{
  const attrs={},ev={};return {dataset:{tab},events:ev,setAttribute:(k,v)=>attrs[k]=String(v),
   getAttribute:k=>attrs[k],removeAttribute:k=>delete attrs[k],
   addEventListener:(name,fn)=>ev[name]=fn,
   getBoundingClientRect:()=>({left:400,width:120,top:190,bottom:235}),
   closest:()=>({getBoundingClientRect:()=>({bottom:260})})};
 });
 const context={
  MENUS:{tradeHistory:[['All History','trade-all']],rankings:[['All','rank:ALL']],
    valueHistory:[['Market','value:market']],leagueHub:[['Daily','league:daily']]},
  activeMenuButton:null,menuEl:()=>menu,
  document:{
   getElementById:id=>id==='fleecedHeaderDropdown'?menu:null,
   querySelectorAll:()=>tabs,
   querySelector:()=>({getBoundingClientRect:()=>({bottom:260}),focus:()=>{}})
  },
  window:{innerWidth:850,innerHeight:750},
  requestAnimationFrame:fn=>fn(),
  setTimeout:()=>{},clearTimeout:()=>{},
  esc:s=>String(s),menuListeners:listeners,
  closeLog:[],
 };
 runInNewContext(fragment,context);
 context.wireMenus();
 return {context,menu,tabs};
}
test('navigation opens only on click, not on pointer hover or focus',()=>{
 const {context,menu,tabs}=fixture();
 const b=tabs[0];
 assert.equal(b.events.pointerenter,undefined);
 assert.equal(b.events.pointerleave,undefined);
 assert.equal(b.events.focus,undefined);
 b.events.click();
 assert.equal(menu.classList.open,true);
 assert.equal(b.getAttribute('aria-expanded'),'true');
 assert.equal(context.activeMenuButton,b);
 assert.ok(Number.parseFloat(menu.style.top)>=260,'dropdown must clear the header');
 b.events.click();
 assert.equal(menu.classList.open,false);
 assert.equal(b.getAttribute('aria-expanded'),'false');
});
test('switching menus uses one persistent panel and normal tab names retain their actions',()=>{
 const {context,menu,tabs}=fixture();
 tabs[0].events.click();tabs[1].events.click();
 assert.equal(context.activeMenuButton,tabs[1]);
 assert.equal(tabs[0].getAttribute('aria-expanded'),'false');
 assert.equal(tabs[1].getAttribute('aria-expanded'),'true');
 tabs[4].events.click();
 assert.equal(menu.classList.open,false);
});
test('keyboard ArrowDown opens menu and Escape dismisses it',()=>{
 const {context,menu,tabs}=fixture(),button=tabs[1];
 let prevented=false;
 button.events.keydown({key:'ArrowDown',preventDefault:()=>prevented=true});
 assert.equal(prevented,true);
 assert.equal(menu.classList.open,true);
 button.events.keydown({key:'Escape',preventDefault:()=>{}});
 assert.equal(menu.classList.open,false);
});
test('outside-click/Escape close installed; no hover-dismiss timer remains; original action mapping remains',()=>{
 assert.doesNotMatch(src,/scheduleCloseMenu|menuCloseTimer/);
 assert.match(src,/document.addEventListener\('click',e=>\{/);
 assert.match(src,/document.addEventListener\('keydown',e=>\{/);
 assert.match(src,/runMenuAction\(action\)/);
 assert.match(src,/button.addEventListener\('click'/);
 assert.match(site,/fleeced-header-v512\.js\?v=536/);
});
