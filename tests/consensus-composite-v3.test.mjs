import test from "node:test";
import assert from "node:assert/strict";
import { buildConsensusComposite } from "../netlify/functions/consensus-composite-v3.mjs";

const result=(source,id,rows,reducedWeight=false)=>({source,id,valid:true,rankings:rows,reducedWeight});

test("keeps IDP rank/value separate from offensive rank/value",()=>{
  const results=[
    result("Off A","off-a",[{player:"Elite WR",rank:15,position:"WR"}]),
    result("Off B","off-b",[{player:"Elite WR",rank:15,position:"WR"}]),
    result("IDP A","idp-a",[{player:"Elite LB",rank:15,position:"LB"}]),
    result("IDP B","idp-b",[{player:"Elite LB",rank:15,position:"LB"}])
  ];
  const players=[{id:"wr",name:"Elite WR",positions:["WR"]},{id:"lb",name:"Elite LB",positions:["LB"]}];
  const c=buildConsensusComposite(results,players);
  assert.ok(c.byId.wr>c.byId.lb);
  assert.equal(c.detailsById.wr.offenseRank,1);
  assert.equal(c.detailsById.lb.idpRank,1);
});

test("dual-role player combines offense with a capped IDP contribution",()=>{
  const results=[
    result("Off A","off-a",[{player:"Dual Star",rank:10,position:"WR"}]),
    result("Off B","off-b",[{player:"Dual Star",rank:10,position:"WR"}]),
    result("IDP A","idp-a",[{player:"Dual Star",rank:5,position:"DB"}]),
    result("IDP B","idp-b",[{player:"Dual Star",rank:5,position:"DB"}])
  ];
  const c=buildConsensusComposite(results,[{id:"dual",name:"Dual Star",positions:["WR","DB"]}]);
  const d=c.detailsById.dual;
  assert.equal(d.kind,"dual");
  assert.ok(d.consensusCompositeValue>d.offenseValue);
  assert.ok(d.consensusCompositeValue<=Math.round(d.offenseValue*1.20));
});

test("matches suffixless source name to Sleeper suffix name when position is compatible",()=>{
  const results=[
    result("Off A","off-a",[{player:"Kenneth Walker",rank:20,position:"RB"}]),
    result("Off B","off-b",[{player:"Kenneth Walker",rank:22,position:"RB"}])
  ];
  const c=buildConsensusComposite(results,[{id:"kw3",name:"Kenneth Walker III",positions:["RB"]}]);
  assert.ok(c.byId.kw3>0);
  assert.equal(c.detailsById.kw3.kind,"offense");
});

test("does not assign an exact-name source row to an incompatible-position Sleeper player",()=>{
  const results=[result("Off A","off-a",[{player:"Kenneth Walker",rank:20,position:"RB"}])];
  const players=[
    {id:"wrong",name:"Kenneth Walker",positions:["WR"]},
    {id:"right",name:"Kenneth Walker III",positions:["RB"]}
  ];
  const c=buildConsensusComposite(results,players);
  assert.equal(c.byId.wrong,undefined);
  assert.ok(c.byId.right>0);
});

test("offensive ranking trace exposes source ranks and omission penalties without altering IDP",()=>{
  const mk=(name,rank)=>({player:name,rank,position:"WR"});
  const a=Array.from({length:30},(_,i)=>mk(i===9?"Denzel Boston":"A"+i,i+1));
  const b=Array.from({length:30},(_,i)=>mk(i===11?"Denzel Boston":"B"+i,i+1));
  const missing=Array.from({length:30},(_,i)=>mk("C"+i,i+1));
  const rows=[result("Ranker A","ranker-a",a),result("Ranker B","ranker-b",b),
    result("Ranker C","ranker-c",missing),
    result("IDP A","idp-a",[{player:"Elite LB",rank:1,position:"LB"}])];
  const c=buildConsensusComposite(rows,[{id:"denzel",name:"Denzel Boston",positions:["WR"]},
    {id:"lb",name:"Elite LB",positions:["LB"]}]);
  const trace=c.detailsById.denzel.offenseSourceEvidence;
  assert.equal(c.detailsById.denzel.offenseObservedSourceCount,2);
  assert.equal(trace.length,3);
  assert.deepEqual(trace.filter(x=>x.listed).map(x=>[x.source,x.rank]),
    [["Ranker A",10],["Ranker B",12]]);
  assert.equal(trace.filter(x=>!x.listed).length,1);
  assert.ok(trace[2].source.includes("(not listed)"));
  // Existing single-source IDP coverage floor is 180, not raw source rank 1.
  assert.equal(c.detailsById.lb.idpRank,180);
  assert.equal(c.detailsById.lb.offenseSourceEvidence.length,0);
  assert.ok(Math.abs(trace.reduce((s,x)=>s+x.rank*x.weight,0)/
    trace.reduce((s,x)=>s+x.weight,0)-c.detailsById.denzel.offenseRank)<1e-10);
});

test("offense never invents consensus from same-first-and-last partial name",()=>{
  const results=[
    result("Ranker A","off-a",[{player:"Chris Bell",rank:50,position:"WR"}]),
    result("Ranker B","off-b",[{player:"Chris Bell",rank:55,position:"WR"}])
  ];
  const players=[
    {id:"autman",name:"Chris Autman-Bell",positions:["WR"]},
    {id:"bell",name:"Chris Bell",positions:["WR"]}
  ];
  const c=buildConsensusComposite(results,players);
  assert.equal(c.byId.autman,undefined);
  assert.equal(c.detailsById.autman,undefined);
  assert.ok(c.byId.bell>0);
  assert.equal(c.detailsById.bell.offenseObservedSourceCount,2);
});
test("only offense tightens matching; IDP keeps its prior compatible first-and-last alias rule",()=>{
  const results=[result("IDP A","idp-a",[{player:"John Smith",rank:30,position:"LB"}]),
    result("IDP B","idp-b",[{player:"John Smith",rank:32,position:"LB"}])];
  const c=buildConsensusComposite(results,[
    {id:"john",name:"John Andrew Smith",positions:["LB"]}]);
  assert.ok(c.byId.john>0);
  assert.equal(c.detailsById.john.idpRank,1);
});

test("three identically named WR roster identities cannot inherit one publisher ranking",()=>{
  const results=[
    result("FantasyPros","fantasypros",[{player:"Kyle Williams",rank:14,position:"WR"}]),
    result("KTC","ktc",[{player:"Kyle Williams",rank:18,position:"WR"}]),
    result("FanRanked","fanranked",[{player:"Kyle Williams",rank:17}])
  ];
  const c=buildConsensusComposite(results,[
    {id:"7437",name:"Kyle Williams",positions:["WR"]},
    {id:"638",name:"Kyle Williams",positions:["WR"]},
    {id:"12547",name:"Kyle Williams",positions:["WR"]}
  ]);
  for(const id of ["7437","638","12547"])assert.equal(c.byId[id],undefined);
});
test("ambiguous suffix collision preserves a player only when position proves its identity",()=>{
  const c=buildConsensusComposite([
    result("Ranker WR","off-wr",[{player:"Kenneth Walker III",rank:12,position:"RB"}]),
    result("Ranker ambiguous","off-a",[{player:"Kenneth Walker",rank:15}])
  ],[
    {id:"rb",name:"Kenneth Walker III",positions:["RB"]},
    {id:"wr",name:"Kenneth Walker",positions:["WR"]}
  ]);
  assert.equal(c.detailsById.rb.offenseObservedSourceCount,1);
  assert.equal(c.detailsById.rb.offenseSources[0],"Ranker WR");
  assert.equal(c.byId.wr,undefined);
});
test("untyped source rank cannot be assigned to same-name players at different positions",()=>{
  const c=buildConsensusComposite([
    result("FanRanked","fanranked",[{player:"Antonio Williams",rank:2}])
  ],[
    {id:"receiver",name:"Antonio Williams",positions:["WR"]},
    {id:"back",name:"Antonio Williams",positions:["RB"]}
  ]);
  assert.equal(c.byId.receiver,undefined);
  assert.equal(c.byId.back,undefined);
});
test("same-position suffix collision is not treated as a confidently identified ranking",()=>{
  const c=buildConsensusComposite([
    result("KTC","ktc",[{player:"Frank Gore Jr.",rank:50,position:"RB"}])
  ],[
    {id:"junior",name:"Frank Gore Jr.",positions:["RB"]},
    {id:"senior",name:"Frank Gore",positions:["RB"]}
  ]);
  assert.equal(c.byId.junior,undefined);
  assert.equal(c.byId.senior,undefined);
});

test("distinct source WR/RB rows retain both validated same-name players when positions prove identity",()=>{
  const c=buildConsensusComposite([
    result("Named ranks","off-a",[
      {player:"Antonio Williams",rank:5,position:"WR"},
      {player:"Antonio Williams",rank:30,position:"RB"}
    ])
  ],[
    {id:"receiver",name:"Antonio Williams",positions:["WR"]},
    {id:"back",name:"Antonio Williams",positions:["RB"]}
  ]);
  assert.equal(c.detailsById.receiver.offenseSources[0],"Named ranks");
  assert.equal(c.detailsById.receiver.offenseSourceEvidence[0].rank,1);
  assert.equal(c.detailsById.back.offenseSources[0],"Named ranks");
  assert.equal(c.detailsById.back.offenseSourceEvidence[0].rank,2);
});


const rankedWithTarget=(name,position,rank,total=250)=>Array.from({length:total},(_,i)=>({
  player:i===rank-1?name:'Generated '+position+' '+i,rank:i+1,position
}));
const robustFactor=(rank,center,mad,count)=>{
  const scale=Math.max(15,.30*center,1.4826*mad);
  const floor={3:.70,4:.50,5:.35}[count];
  return floor+(1-floor)/(1+(Math.abs(rank-center)/(2*scale))**4);
};
test("every five-source offensive asset receives the same continuous weighting formula",()=>{
  const target="Matthew Golden",ranks=[47,37,133,19,24],names=["FantasyPros","DraftSharks","The IDP Show Combined Offense","KTC","FanRanked"];
  const results=names.map((name,i)=>result(name,i===2?"combined-dynasty":name.toLowerCase(),rankedWithTarget(target,"WR",ranks[i]),i===3));
  const d=buildConsensusComposite(results,[{id:"golden",name:target,positions:["WR"]}]).detailsById.golden;
  assert.equal(d.offenseRobustWeights.length,5);
  assert.equal(d.offenseObservedSourceCount,5);
  const center=37,mad=13,baseWeights=[1,1,1,.5,1];
  const expectedWeights=ranks.map((v,i)=>baseWeights[i]*robustFactor(v,center,mad,5));
  const expectedRank=ranks.reduce((sum,v,i)=>sum+v*expectedWeights[i],0)/expectedWeights.reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(d.offenseRank-expectedRank)<1e-8);
  for(let i=0;i<5;i++){
    assert.equal(d.offenseSourceEvidence[i].source,names[i]);
    assert.ok(Math.abs(d.offenseSourceEvidence[i].weight-expectedWeights[i])<1e-10);
    assert.equal(d.offenseSourceEvidence[i].baseWeight,baseWeights[i]);
    assert.equal(d.offenseSourceEvidence[i].robustEvaluated,true);
  }
  assert.ok(d.offenseRank<45&&d.offenseRank>35);
  assert.ok(d.offenseOutlierAdjustments.some(x=>x.source==="The IDP Show Combined Offense"));
});
test("continuous weights have no abrupt 40-position cliff",()=>{
  const target="Smooth Rookie";
  function build(rank){
    const data=[20,23,27,rank].map((v,i)=>result(["FantasyPros","DraftSharks","KTC","FanRanked"][i],
      "source-"+i,rankedWithTarget(target,"WR",v)));
    return buildConsensusComposite(data,[{id:"rookie",name:target,positions:["WR"]}]).detailsById.rookie;
  }
  const before=build(66),after=build(67);
  const wb=before.offenseSourceEvidence[3].weight,wa=after.offenseSourceEvidence[3].weight;
  assert.ok(wa<wb);
  assert.ok(wb-wa<.02,"nearby source ranks cannot trigger a sudden discrete 75% cut");
  assert.ok(Math.abs(after.offenseRank-before.offenseRank)<1);
  assert.equal(before.offenseRobustWeights.length,4);
});
test("three independent sources get cautious continuous weighting; two sources are left alone",()=>{
  const target="Sparse Rookie";
  function build(ranks){
    const names=["FantasyPros","KTC","FanRanked"];
    return buildConsensusComposite(ranks.map((v,i)=>result(names[i],"source-"+i,rankedWithTarget(target,"WR",v))),
      [{id:"sparse",name:target,positions:["WR"]}]).detailsById.sparse;
  }
  const three=build([20,22,170]);
  assert.equal(three.offenseRobustWeights.length,3);
  assert.ok(three.offenseSourceEvidence[2].weight>=.7-1e-10);
  assert.ok(three.offenseSourceEvidence[2].weight<1);
  const two=build([20,170]);
  assert.equal(two.offenseRobustWeights.length,0);
  assert.equal(two.offenseSourceEvidence[1].weight,1);
});
test("two equally sized market camps retain their original influence",()=>{
  const target="Divided Rookie",ranks=[20,30,125,135];
  const d=buildConsensusComposite(ranks.map((v,i)=>result("Source "+i,"off-"+i,rankedWithTarget(target,"WR",v))),
    [{id:"split",name:target,positions:["WR"]}]).detailsById.split;
  assert.equal(d.offenseRobustWeights.length,4);
  assert.ok(d.offenseSourceEvidence.every(x=>x.weight>.99),"broad dispersion means no artificially selected winning camp");
});
test("one-source floor and missing consensus stay conservative",()=>{
  const d=buildConsensusComposite([
    result("FantasyPros","fantasypros",rankedWithTarget("Lonely Rookie","RB",1))
  ],[{id:"solo",name:"Lonely Rookie",positions:["RB"]},{id:"unknown",name:"Missing Player",positions:["WR"]}]);
  assert.equal(d.detailsById.solo.offenseRank,260);
  assert.equal(d.detailsById.solo.offenseRobustWeights.length,0);
  assert.equal(d.byId.unknown,undefined);
});
test("omission penalties do not become counted agreeing peers",()=>{
  const target="Two Peers";
  const results=[
    result("FantasyPros","fantasypros",rankedWithTarget(target,"WR",20)),
    result("DraftSharks","draftsharks",rankedWithTarget(target,"WR",25)),
    result("The IDP Show Combined","combined-dynasty",rankedWithTarget(target,"WR",150)),
    result("KTC","ktc",rankedWithTarget("Absent A","WR",100)),
    result("FanRanked","fanranked",rankedWithTarget("Absent B","WR",100))
  ];
  const d=buildConsensusComposite(results,[{id:"two",name:target,positions:["WR"]}]).detailsById.two;
  assert.equal(d.offenseObservedSourceCount,3);
  assert.equal(d.offenseRobustWeights.length,3);
  assert.ok(d.offenseSourceEvidence.some(x=>!x.listed));
});
test("IDP ranks and valuations still use the exact unmodified IDP aggregation",()=>{
  const target="Linebacker Outlier",ranks=[20,21,22,130];
  const d=buildConsensusComposite(ranks.map((v,i)=>result("IDP "+i,"source-"+i+"-idp",rankedWithTarget(target,"LB",v))),
    [{id:"lb",name:target,positions:["LB"]}]).detailsById.lb;
  assert.equal(d.idpRank,(20+21+22+130)/4);
  assert.deepEqual(d.offenseRobustWeights,[]);
  assert.deepEqual(d.offenseOutlierAdjustments,[]);
});


test('same-name IDPs without unique position or team evidence never share a source rank',()=>{
 const results=[result('IDP publisher','source-idp',[
  {player:'Chris Jones',rank:4,position:'DL'}
 ])];
 const players=[
  {id:'3558',name:'Chris Jones',positions:['DL'],position:'DT',team:'KC'},
  {id:'1430',name:'Chris Jones',positions:['DL'],position:'DT',team:null},
  {id:'5815',name:'Chris Jones',positions:['DB'],position:'CB',team:null}
 ];
 const data=buildConsensusComposite(results,players);
 assert.equal(data.byId['3558'],undefined,'ambiguous DL name must not be assigned by guess');
 assert.equal(data.byId['1430'],undefined,'inactive same-name DL cannot inherit KC ranking');
 assert.equal(data.byId['5815'],undefined,'same-name CB must not inherit DL consensus');
});
test('same-name IDP with sourced team is assigned only to the single matching Sleeper ID',()=>{
 const results=[result('IDP publisher','source-idp',[
  {player:'Chris Jones',rank:4,position:'DT',team:'KC'}
 ])];
 const players=[
  {id:'3558',name:'Chris Jones',positions:['DL'],position:'DT',team:'KC'},
  {id:'1430',name:'Chris Jones',positions:['DL'],position:'DT',team:null},
  {id:'5815',name:'Chris Jones',positions:['DB'],position:'CB',team:null}
 ];
 const data=buildConsensusComposite(results,players);
 assert.ok(data.byId['3558']>0,'verified Kansas City IDP retains consensus');
 assert.equal(data.byId['1430'],undefined);
 assert.equal(data.byId['5815'],undefined);
 assert.equal(data.detailsById['3558'].idpIdentityPeerCount,3);
});
test('position alone disambiguates different same-name IDP roles without guessing teams',()=>{
 const results=[result('IDP publisher','source-idp',[
  {player:'Same Name',rank:11,position:'CB'}
 ])];
 const players=[
  {id:'cb',name:'Same Name',positions:['DB'],position:'CB'},
  {id:'dt',name:'Same Name',positions:['DL'],position:'DT'}
 ];
 const data=buildConsensusComposite(results,players);
 assert.ok(data.byId.cb>0);
 assert.equal(data.byId.dt,undefined);
});
