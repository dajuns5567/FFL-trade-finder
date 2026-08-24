const fs=require('fs');const vm=require('vm');
global.window=global;
const baseValues=new Map([['te',3333],['eliteTe',9900],['wr',4000],['rb',2500],['qb',6000],['idp',1800],['pick',900]]);
const positions=new Map([['te','TE'],['eliteTe','TE'],['wr','WR'],['rb','RB'],['qb','QB'],['idp','IDP']]);
window.state={league:{season:'2026',scoring_settings:{rec:1,bonus_rec_te:0}},players:{te:{fantasy_positions:['TE']},eliteTe:{fantasy_positions:['TE']},wr:{fantasy_positions:['WR']},rb:{fantasy_positions:['RB']},qb:{fantasy_positions:['QB']},idp:{fantasy_positions:['DL']}}};
window.groupPos=a=>a?.type==='pick'?'PICK':positions.get(a?.id)||'IDP';
const source={MAX:9999,canonicalValue:a=>baseValues.get(a?.id)||0,playerValue:a=>baseValues.get(a?.id)||0,canonicalPackageValue:xs=>(xs||[]).reduce((s,a)=>s+(baseValues.get(a.id)||0),0)};
window.tradeValueNormalizationV130=source;window.tradeValueNormalizationV139=source;
window.tradeEngine96={};window.tradeEngine98={};window.tradeEngine99={};
vm.runInThisContext(fs.readFileSync('trade-te-scoring-adjustment-v259.js','utf8'),{filename:'trade-te-scoring-adjustment-v259.js'});
const te={type:'player',id:'te'},eliteTe={type:'player',id:'eliteTe'},wr={type:'player',id:'wr'},rb={type:'player',id:'rb'},qb={type:'player',id:'qb'},idp={type:'player',id:'idp'},pick={type:'pick',id:'pick'};
const api=window.tradeValueNormalizationV130;
function eq(actual,expected,label){if(actual!==expected)throw new Error(`${label}: expected ${expected}, got ${actual}`)}
function currentOriginalExact(){eq(api.canonicalValue(te),3333,'2026 TE exact non-round value');eq(window.baseValue(te),3333,'2026 baseValue TE exact non-round value');eq(api.playerValue(te),3333,'2026 playerValue TE exact non-round value');eq(api.canonicalValue(eliteTe),9900,'2026 elite TE exact value');eq(api.canonicalPackageValue([te,wr]),7333,'2026 package exact value');}
currentOriginalExact();
for(const a of[wr,rb,qb,idp,pick])eq(api.canonicalValue(a),baseValues.get(a.id),`2026 non-TE ${a.id} unchanged`);
window.state.league.scoring_settings={rec:1,bonus_rec_te:.25};
eq(api.canonicalValue(te),3415,'1.25 TE PPR +2.5%');eq(window.baseValue(te),3415,'live baseValue sees 1.25 TE PPR');eq(api.canonicalValue(wr),4000,'WR unchanged at 1.25 TE PPR');eq(api.canonicalValue(pick),900,'pick unchanged at 1.25 TE PPR');eq(api.canonicalPackageValue([te,wr]),7415,'package uses live 1.25 TE PPR');eq(window.tradeEngine96.assetValue(te),3415,'engine uses live 1.25 TE PPR');eq(api.canonicalValue(eliteTe),9999,'TE adjustment respects existing 9999 maximum');
window.state.league.scoring_settings={rec:1,bonus_rec_te:.5};
eq(api.canonicalValue(te),3500,'1.50 TE PPR +5%');eq(api.canonicalValue(wr),4000,'WR unchanged at 1.50 TE PPR');eq(api.canonicalPackageValue([te,wr]),7500,'package uses live 1.50 TE PPR');eq(api.canonicalValue(eliteTe),9999,'1.50 TE PPR respects existing 9999 maximum');
window.state.league.scoring_settings={rec:1,bonus_rec_te:0};currentOriginalExact();
window.state.league.scoring_settings={rec:1};currentOriginalExact();
window.state.league.scoring_settings={rec:1,bonus_rec_te:-.25};currentOriginalExact();
console.log('V259 TE scoring smoke passed: live Sleeper bonus_rec_te drives TE-only adjustment; zero/missing bonus is exact V258 behavior and 9999 cap is preserved.');
