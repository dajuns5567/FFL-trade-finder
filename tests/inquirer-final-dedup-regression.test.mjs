import test from 'node:test';
import assert from 'node:assert/strict';
import {pruneForwardInheritedEchoes} from '../netlify/functions/inquirer-editorial-v31.mjs';

test('last writer removes verbatim inherited roster prose without modifying archived edition',()=>{
 const repeated='The manager talked about the last decision but never explained which player actually made the difference in the recorded lineup.';
 const original=Array.from({length:30},(_,i)=>'Recorded Week Six roster item '+i+' considers the actual player contribution for this particular football matchup in independent prose.').join(' ');
 const prior={teams:[{roster_id:1,inquirer_article:{paragraphs:[repeated]}}]};
 const snapshot=JSON.stringify(prior);
 const article={sections:[{kind:'management',paragraphs:[repeated,original]}]};
 const teams=[{roster_id:1,inquirer_article:article}];
 pruneForwardInheritedEchoes(teams,prior);
 assert.equal(JSON.stringify(prior),snapshot);
 assert.doesNotMatch(article.paragraphs.join(' '),/manager talked about the last decision/);
 assert.ok(article.paragraphs.join(' ').split(/\s+/).length>=300);
});
