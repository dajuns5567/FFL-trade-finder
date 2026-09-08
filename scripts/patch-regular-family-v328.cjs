const fs=require('fs');
const file=process.argv[2]||'trade-finder-v256-compiled.js';
let s=fs.readFileSync(file,'utf8');
function once(oldText,newText,label){const n=s.split(oldText).length-1;if(n!==1)throw new Error('V328 patch guard failed '+label+': '+n);s=s.replace(oldText,newText)}

const assetOld="function assetKey(xs){return(xs||[]).map(x=>`${x.type}:${id(x)}`).sort().join('|')}";
once(assetOld,assetOld+"function outgoingFamilyKey(xs){const ps=(xs||[]).filter(x=>x.type==='player').map(x=>id(x)).sort();return ps.length?`P:${ps.join('|')}`:`K:${assetKey(xs)}`}",'assetKey');

const selectStart=s.indexOf('function selectBlankDistribution(eligible){');
const selectEnd=s.indexOf('function stabilizeBlankOrder(',selectStart);
if(selectStart<0||selectEnd<0)throw new Error('V328 patch guard failed blank selector bounds');
const selectNew="function selectBlankDistribution(eligible){if(eligible.length<=1)return eligible.slice();const familyAware=finderMode()!=='draft',cuts=blankTierCuts(eligible),buckets={high:[],mid:[],low:[]};for(const r of eligible)buckets[blankTierOf(r,cuts)].push(r);for(const k of Object.keys(buckets))buckets[k].sort(presentationSort);const pattern=['mid','high','mid','low','high','mid','high','mid','low','mid','high','mid','low','high','mid','high','mid','low','high','mid'],out=[],picked=new Set(),playerUse=new Map(),giveUse=new Map(),familyUse=new Map(),recentPlayers=[],recentGives=[],recentFamilies=[],giveWave={n:1};const available=()=>Object.values(buckets).some(b=>b.some(r=>!picked.has(r)&&(giveUse.get(assetKey(r.give))||0)<5));const take=(tier,strict)=>{const b=buckets[tier]||[];const maxUse=1+Math.floor(out.length/18),familyMax=1+Math.floor(out.length/18);for(const r of b){if(picked.has(r))continue;const gk=assetKey(r.give),fk=outgoingFamilyKey(r.give);if((giveUse.get(gk)||0)>=Math.min(5,giveWave.n))continue;const ps=outgoingPlayerIds(r),recentPlayerHit=ps.some(p=>recentPlayers.includes(p)),overUse=ps.some(p=>(playerUse.get(p)||0)>=maxUse),recentGiveHit=recentGives.includes(gk),recentFamilyHit=familyAware&&recentFamilies.includes(fk),overFamily=familyAware&&(familyUse.get(fk)||0)>=familyMax;if(strict===2&&(recentPlayerHit||overUse||recentGiveHit||recentFamilyHit||overFamily))continue;if(strict===1&&(recentGiveHit||recentFamilyHit||overFamily))continue;return r}return null};let step=0;while(out.length<MAX_RESULTS&&available()){const wanted=pattern[step++%pattern.length],fallback=wanted==='mid'?['high','low']:wanted==='high'?['mid','low']:['mid','high'];let r=null;for(const strict of[2,1,0]){r=take(wanted,strict);if(!r)for(const k of fallback){r=take(k,strict);if(r)break}if(r)break}if(!r&&giveWave.n<5){giveWave.n++;continue}if(!r)break;picked.add(r);out.push(r);const gk=assetKey(r.give),fk=outgoingFamilyKey(r.give);giveUse.set(gk,(giveUse.get(gk)||0)+1);familyUse.set(fk,(familyUse.get(fk)||0)+1);const ps=outgoingPlayerIds(r);for(const p of ps)playerUse.set(p,(playerUse.get(p)||0)+1);recentPlayers.push(...ps);while(recentPlayers.length>4)recentPlayers.shift();recentGives.push(gk);while(recentGives.length>8)recentGives.shift();recentFamilies.push(fk);while(recentFamilies.length>6)recentFamilies.shift()}return out}";
s=s.slice(0,selectStart)+selectNew+s.slice(selectEnd);

const stabStart=s.indexOf('function stabilizeBlankOrder(');
const stabEnd=s.indexOf('function blankDisplaySort(',stabStart);
if(stabStart<0||stabEnd<0)throw new Error('V328 patch guard failed stabilizer bounds');
const stabOld=s.slice(stabStart,stabEnd);
const stabNew=stabOld+"function stabilizeBlankFamilies(list,tier){if(tier==='draft')return stabilizeBlankOrder(list);const remaining=(list||[]).slice(),out=[],familyUse=new Map(),recentFamilies=[],recentGives=[];let pickRun=0;const close=(r,base)=>{if(maximumValuePresentationActive()){const rv=Number(r?.maximumValueScore),bv=Number(base?.maximumValueScore);return!Number.isFinite(bv)||!Number.isFinite(rv)||rv>=bv-4}return Math.round(Number(r?.f?.score)||0)>=Math.round(Number(base?.f?.score)||0)-2&&Math.round(Number(r?.recommend)||0)>=Math.round(Number(base?.recommend)||0)-4};while(remaining.length){const base=remaining[0];let idx=-1;for(let pass=0;pass<4&&idx<0;pass++){const familyMax=1+Math.floor(out.length/18);for(let i=0;i<Math.min(60,remaining.length);i++){const r=remaining[i],fk=outgoingFamilyKey(r.give),gk=assetKey(r.give),isPick=outgoingPickOnly(r),familyBlocked=recentFamilies.includes(fk)||(familyUse.get(fk)||0)>=familyMax,giveBlocked=recentGives.includes(gk),pickBlocked=pickRun>=2&&isPick,qualityBlocked=!close(r,base);if(pass===0&&(familyBlocked||giveBlocked||pickBlocked||qualityBlocked))continue;if(pass===1&&(familyBlocked||pickBlocked||qualityBlocked))continue;if(pass===2&&(pickBlocked||qualityBlocked))continue;idx=i;break}}if(idx<0)idx=0;const r=remaining.splice(idx,1)[0],fk=outgoingFamilyKey(r.give),gk=assetKey(r.give);out.push(r);familyUse.set(fk,(familyUse.get(fk)||0)+1);recentFamilies.push(fk);while(recentFamilies.length>6)recentFamilies.shift();recentGives.push(gk);while(recentGives.length>8)recentGives.shift();pickRun=outgoingPickOnly(r)?pickRun+1:0}return out}";
s=s.slice(0,stabStart)+stabNew+s.slice(stabEnd);

const blankStart=s.indexOf('const diversified=stabilizeBlankOrder(varied);');
const tail="ordered=maximumValueTierDownMix(ordered);ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);return ordered";
const tailAt=s.indexOf(tail,blankStart);
if(blankStart<0||tailAt<0)throw new Error('V328 patch guard failed blank tail');
const tailNew="ordered=maximumValueTierDownMix(ordered);ordered=diversifyThreeAssetOverlap(ordered,tier);ordered=sprinkleTwoPlayerForTwo(ordered,tier);ordered=stabilizeBlankFamilies(ordered,tier);if(tier!=='draft')for(const r of ordered)r.regularBlankFamilyKey=outgoingFamilyKey(r.give);return ordered";
s=s.slice(0,tailAt)+tailNew+s.slice(tailAt+tail.length);

const cardStart="function card(r,i){const f=r.f,label=f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable';return`<div class=\"result trade95-card\">";
const cardNew="function card(r,i){const f=r.f,label=f.score>=94?'Excellent Fit':f.score>=82?'Fair':'Negotiable',family=r.regularBlankFamilyKey?` data-regular-family-key=\"${esc(r.regularBlankFamilyKey)}\"`:'';return`<div class=\"result trade95-card\"${family}>";
once(cardStart,cardNew,'card marker');

const exportOld='window.tradeFinderV168={render,generateAsync,targetPositions,premiumAsset,valueCenter,rankCenter,packageShape,blankGivePackages,blankSelection,MAX_RESULTS};';
const exportNew='window.tradeFinderV168={render,generateAsync,targetPositions,premiumAsset,valueCenter,rankCenter,packageShape,blankGivePackages,blankSelection,outgoingFamilyKey,selectBlankDistribution,stabilizeBlankFamilies,MAX_RESULTS};';
once(exportOld,exportNew,'exports');

fs.writeFileSync(file,s);
console.log('applied V328 regular blank Finder family patch to '+file);
