#!/usr/bin/env node
// Actual archived candidate versus independently accepted served-copy evidence.
// Read-only, no Netlify connection and no manuscript text in CI logs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'editorial-baselines/2026-week4-v19-served-copy.json'),'utf8'));
const {default:preload}=await import(pathToFileURL(path.join(root,'netlify/functions/inquirer-week4-2026-preload.mjs')).href);
const edition=typeof preload==='function'?preload():preload;
assert.equal(baseline.articles?.length,32);assert.equal(edition.teams?.length,32);
const accepted=new Map(baseline.articles.map(a=>[String(a.team),a]));
const candidate=new Map(edition.teams.map(t=>[String(t.team_name),t]));
assert.equal(accepted.size,32);assert.equal(candidate.size,32);
let expectedParagraphs=0,matchingParagraphs=0;
const missingTeams=[];
for(const [name,article] of accepted){
 const recovered=candidate.get(name);if(!recovered){missingTeams.push(name);continue}
 const candidateArticle=JSON.stringify(recovered.inquirer_article||{});
 for(const section of article.sections||[]){
  for(const text of section.paragraphs||[]){
   if(typeof text!=='string')continue;
   expectedParagraphs++;
   if(candidateArticle.includes(JSON.stringify(text).slice(1,-1)))matchingParagraphs++;
  }
 }
}
assert.equal(missingTeams.length,0,'Accepted edition contains teams absent from recovered preload');
console.log('EDITORIAL SOURCE-VS-SERVED PARITY ASSESSMENT '+JSON.stringify({
 accepted_articles:accepted.size,recovered_teams:candidate.size,
 accepted_paragraphs:expectedParagraphs,exact_paragraphs_in_preload:matchingParagraphs,
 exact_paragraph_coverage:expectedParagraphs?Number((matchingParagraphs/expectedParagraphs*100).toFixed(2)):null,
 all_accepted_paragraphs_present_in_preload:matchingParagraphs===expectedParagraphs,
 served_copy_byte_parity_proven:false, // A substring test cannot establish full rendered-document equality.
 acceptance_reference:baseline.revision
}));
if(matchingParagraphs!==expectedParagraphs)console.log('NOTE: The preload and separately accepted served benchmark diverge; source recovery alone does not prove identical served prose.');
