const fs=require('fs');const vm=require('vm');
const ui=fs.readFileSync('trade-selected-positions-only-v262.js','utf8');
if(!ui.includes('Selected positions only'))throw new Error('V262 UI label missing');
if(!ui.includes('show=count>1'))throw new Error('V262 UI must appear only for 2+ selected positions');
if(!ui.includes('if(input&&!show)input.checked=false'))throw new Error('V262 hidden control must clear stale selection');

let posChecks=[
  {value:'ANY',checked:true},
  {value:'QB',checked:false},
  {value:'RB',checked:false},
  {value:'WR',checked:false},
  {value:'TE',checked:false},
  {value:'IDP',checked:false}
];
const strictInput={checked:false},desired={value:''},mode={value:'balanced'};
const document={
  querySelectorAll(sel){if(sel==='#tradePos97 .trade97-pos:checked')return posChecks.filter(x=>x.checked);return[]},
  getElementById(id){if(id==='tradeSelectedPositionsOnly262')return strictInput;if(id==='desiredPlayerSearch')return desired;if(id==='findMode')return mode;if(id==='finderResults')return null;return null}
};
global.window=global;global.document=document;global.state={players:{}};
global.groupPos=x=>x.pos||'IDP';
global.MutationObserver=class{observe(){}disconnect(){}};
global.setTimeout=()=>1;global.clearTimeout=()=>{};
global.window.addEventListener=()=>{};
let fairCalls=0;
global.section1V130={fair:()=>{fairCalls++;return{rejected:false,score:90}}};
vm.runInThisContext(fs.readFileSync('trade-finder-candidate-guard-v223.js','utf8'),{filename:'trade-finder-candidate-guard-v223.js'});
const api=window.tradeFinderCandidateGuardV223;if(!api)throw new Error('candidate guard API missing');
const QB={type:'player',id:'q',pos:'QB'},WR={type:'player',id:'w',pos:'WR'},RB={type:'player',id:'r',pos:'RB'},PICK={type:'pick',id:'p'};
if(!api.selectedPositionsOnlyOK([QB,RB]))throw new Error('filter changed behavior while option is off');
strictInput.checked=true;
if(!api.selectedPositionsOnlyOK([QB,RB]))throw new Error('filter activated with only ANY/one-or-fewer selected positions');
posChecks.forEach(x=>x.checked=['QB','WR'].includes(x.value));
if(!api.selectedPositionsOnlyActive())throw new Error('filter did not activate for two selected positions');
if(!api.selectedPositionsOnlyOK([QB,WR,PICK]))throw new Error('selected positions and picks should be allowed');
if(api.selectedPositionsOnlyOK([QB,RB]))throw new Error('unselected incoming position was not rejected');
desired.value='Specific Player';
if(api.selectedPositionsOnlyActive())throw new Error('filter must not affect Acquire Specific Player');
if(!api.selectedPositionsOnlyOK([QB,RB]))throw new Error('Acquire Specific Player was affected');
desired.value='';api.activate();
let before=fairCalls,f=window.section1V130.fair([], [QB,RB]);
if(!f.rejected||f.finderGuardReason!=='selected-positions-only')throw new Error('active Finder guard did not reject mixed unselected package');
if(fairCalls!==before)throw new Error('selected-position rejection still performed unnecessary fairness work');
before=fairCalls;f=window.section1V130.fair([], [QB,WR,PICK]);
if(f.rejected)throw new Error('active Finder guard rejected selected-position package');
if(fairCalls!==before+1)throw new Error('eligible selected-position package did not use normal fairness exactly once');
strictInput.checked=false;
before=fairCalls;f=window.section1V130.fair([], [QB,RB]);
if(f.rejected)throw new Error('guard changed baseline recommendation when option turned off');
if(fairCalls!==before+1)throw new Error('option-off state altered normal fairness execution');
api.deactivate();
console.log('V263 Selected positions only regression/performance smoke passed');
