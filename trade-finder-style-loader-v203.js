(()=>{
'use strict';
// V203 is a narrow source transform over the working V202 loader.
// It changes only Maximum Value presentation/candidate preferences for neutral Fair Trade and Tier Up.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v202.js?v=202',false);
try{xhr.send(null)}catch(e){console.error('V203 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V203 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// Maximum Value + Fair Trade: retain a broader 3-asset candidate buffer.
const oldBuffer="(searchStyle()==='value'&&tier==='neutral')?16:(searchStyle()==='balanced'&&tier==='neutral')?10:(neutralThreeVariety?8:3)";
const newBuffer="(searchStyle()==='value'&&tier==='neutral')?24:(searchStyle()==='balanced'&&tier==='neutral')?10:(neutralThreeVariety?8:3)";
if(src.split(oldBuffer).length-1!==1){console.error('V203 guard failed: Maximum Value neutral buffer');return}
src=src.replace(oldBuffer,newBuffer);

// Maximum Value + Fair Trade: increase 3-incoming representation without making it dominant.
const oldNeutral="['2-2','2-3','3-2','1-3','2-1','3-3','2-2','2-3','3-1','1-2','3-2','2-3','1-1']";
const newNeutral="['2-3','2-2','3-2','1-3','2-1','2-3','3-3','2-2','3-2','1-3','3-1','2-3','1-2','2-2','1-1']";
if(src.split(oldNeutral).length-1!==1){console.error('V203 guard failed: Maximum Value neutral shape mix');return}
src=src.replace(oldNeutral,newNeutral);

// Maximum Value + Tier Up: mix in more valid 2-for-2 deals, but keep 2-for-1 as the leading shape.
const oldTierUp="['2-1','2-2','2-1','1-1','2-1','2-2','1-2','2-1','3-1']";
const newTierUp="['2-1','2-2','2-1','2-2','1-1','2-1','2-2','1-2','2-1','3-1']";
if(src.split(oldTierUp).length-1!==1){console.error('V203 guard failed: Maximum Value Tier Up shape mix');return}
src=src.replace(oldTierUp,newTierUp);

src=src.replaceAll('V202 Finder','V203 Finder')
       .replace("version:'v202',base:'v200'","version:'v203',base:'v202'")
       .replace('trade-finder-v150-v202-runtime.js','trade-finder-v150-v203-runtime.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v203-transformed.js')}catch(e){console.error('V203 loader eval failed',e)}
})();
