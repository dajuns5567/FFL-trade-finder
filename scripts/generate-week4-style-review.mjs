#!/usr/bin/env node
// Explicit, offline review-only generation. Never writes to public Blobs or
// invokes a publication endpoint. All three source files must be operator-
// supplied snapshots of the same season, with actual locked Week 4 style.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWeek4EditorialModelClient} from '../netlify/functions/inquirer-week4-model-client.mjs';
import {buildWeek4EditorialBatch} from '../netlify/functions/inquirer-week4-batch.mjs';
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';

const productionUrl='https://phenomenal-mousse-f0a00c.netlify.app';
const canonical=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const factualRoster=team=>{const facts={...team};delete facts.inquirer_article;return facts};

// Recover original official source facts from an independently saved, read-only
// Week 5 audit. The separately saved correction candidate is used only to
// cross-check factual immutability; none of its draft prose becomes style input.
export function recoveredWeek5Inputs(audit,correction){
  const week4=audit?.artifacts?.week4,week5=audit?.artifacts?.week5;
  const candidate=correction?.edition;
  if(audit?.readOnly!==true||audit.site!==productionUrl)
    throw new Error('Official production read-only audit provenance is required');
  if(Number(week4?.week)!==4||Number(week5?.week)!==5||Number(week5?.season)!==2026||
    week4?.teams?.length!==32||week5?.teams?.length!==32||week5?.published_locked!==true)
    throw new Error('Complete locked Week 4/5 audit snapshots are required');
  if(Number(candidate?.week)!==5||candidate?.teams?.length!==32||correction.review_status!=='unapproved')
    throw new Error('The saved independent Week 5 review candidate is missing');
  const byId=new Map(candidate.teams.map(t=>[String(t.roster_id),t]));
  for(const team of week5.teams){
    const same=byId.get(String(team.roster_id));
    if(!same||canonical(factualRoster(team))!==canonical(factualRoster(same)))
      throw new Error('Recovered Week 5 facts differ for roster '+team.roster_id);
  }
  if(week5.teams.length!==byId.size)throw new Error('Recovered Week 5 roster coverage differs');
  // The read-only audit's Week 4 response strips the top-level lock flag;
  // reinstate it solely for in-memory reference verification, never publication.
  return{current:week5,week4:{...week4,published_locked:true},previous:{...week4,published_locked:true}};
}

export async function generateWeek4Review({current,week4,previous,modelClient,model}){
  if(Number(current?.season)!==Number(week4?.season)||Number(current?.season)!==Number(previous?.season))
    throw new Error('Editorial source seasons differ');
  if(Number(previous?.week)!==Number(current?.week)-1)
    throw new Error('The immediately preceding published week is required');
  if(current.published_locked!==true||previous.published_locked!==true)
    throw new Error('Published weekly factual snapshots required');
  const result=await buildWeek4EditorialBatch({edition:current,acceptedWeek4:week4,
    previousEdition:previous,client:modelClient,model,concurrency:2});
  return{schema:'fleeced-editorial-review-draft-v1',season:Number(current.season),week:Number(current.week),
    sha256:editorialCopyDigest(result.edition),quality:result.quality,
    review_status:'unapproved',publishable:false,edition:result.edition};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2),recovered=args[0]==='--recovered';
  const [currentPath,week4Path,previousPath,outPath]=recovered?[args[1],args[2],null,args[3]]:args;
  if(!currentPath||!week4Path||(!recovered&&!previousPath)||!outPath||!process.env.EDITORIAL_MODEL){
    console.error('Usage: EDITORIAL_MODEL=<configured model> OPENAI_API_KEY=<server secret> node scripts/generate-week4-style-review.mjs [--recovered <read-only-week5-audit.json> <saved-review-candidate.json> <new-output.json> | <current-locked.json> <week4-locked.json> <previous-locked.json> <new-output.json>]');
    process.exitCode=2;
  }else{
    try{
      const sources=recovered?recoveredWeek5Inputs(...await Promise.all([currentPath,week4Path].map(async p=>JSON.parse(await readFile(p,'utf8'))))):
        Object.fromEntries(await Promise.all([['current',currentPath],['week4',week4Path],['previous',previousPath]].map(async([key,p])=>[key,JSON.parse(await readFile(p,'utf8'))])));
      const modelClient=createWeek4EditorialModelClient({apiKey:process.env.OPENAI_API_KEY,baseUrl:process.env.OPENAI_BASE_URL});
      const review=await generateWeek4Review({...sources,modelClient,model:process.env.EDITORIAL_MODEL});
      await writeFile(outPath,JSON.stringify(review,null,2)+'\n',{flag:'wx',mode:0o600});
      console.log(JSON.stringify({output:outPath,sha256:review.sha256,quality_ok:review.quality.ok,publishable:false}));
    }catch(error){console.error('Editorial review generation failed:',error.message);process.exitCode=1}
  }
}
