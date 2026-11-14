import test from 'node:test';
import assert from 'node:assert/strict';
import {buildConsensusComposite} from '../netlify/functions/consensus-composite-v3.mjs';
const idp=(rows)=>({id:'idp-source',source:'IDP publisher',valid:true,rankings:rows});
const row=(player,rank=5,position='LB',team)=>({player,rank,position,...(team?{team}: {})});
const player=(id,name,position='LB',team)=>({id,name,positions:[position],position,team:team||null});

test('fuzzy first-name publisher rank never leaks across different Sleeper defensive identities',()=>{
 for(const [first,other,last] of [
   ['Quinnen','Quincy','Williams'],
   ['Christian','Chris','Gonzalez'],
   ['Carlton','Carl','Davis'],
   ['Jonathan','Jonathon','Cooper'],
   ['Marcus','Marcel','Jones']
 ]){
  const a=player('confirmed',first+' '+last),b=player('unconfirmed',other+' '+last);
  const result=buildConsensusComposite([idp([row(a.name)])],[a,b]);
  assert.ok(result.byId.confirmed>0,first+' confirmed source should retain its rank');
  assert.equal(result.byId.unconfirmed,undefined,other+' must NOT borrow a different Sleeper identity');
 }
});

test('when publisher independently lists both similar-name IDs, keep both identities',()=>{
 const a=player('a','Quinnen Williams'),b=player('b','Quincy Williams');
 const data=buildConsensusComposite([idp([row(a.name,5),row(b.name,7)])],[a,b]);
 assert.ok(data.byId.a>0);
 assert.ok(data.byId.b>0);
 assert.equal(data.detailsById.a.idpSources.length,1);
 assert.equal(data.detailsById.b.idpSources.length,1);
});

test('unique name aliases remain supported when there is no plausible competing Sleeper IDP',()=>{
 const data=buildConsensusComposite([idp([row('Jonathon Cooper')])],
  [player('single','Jonathan Cooper')]);
 assert.ok(data.byId.single>0,'single uniquely owned fuzzy alias is a qualified match');
});

test('same-name identity collision guard and offensive source matching remain unchanged',()=>{
 const players=[
  player('idp-a','Chris Jones','DL','KC'),player('idp-b','Chris Jones','DL',null),
  player('wr','Chris Jones','WR','KC')
 ];
 const sources=[idp([row('Chris Jones',1,'DL','KC')]),
  {id:'offense-source',source:'Dynasty PPR',valid:true,rankings:[row('Chris Jones',1,'WR')]}];
 const data=buildConsensusComposite(sources,players);
 assert.ok(data.byId['idp-a']>0);
 assert.equal(data.byId['idp-b'],undefined);
 assert.ok(data.byId.wr>0);
});
