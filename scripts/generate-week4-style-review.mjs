#!/usr/bin/env node
// Explicit, offline review-only generation. Never writes to public Blobs or
// invokes a publication endpoint. All three source files must be operator-
// supplied snapshots of the same season, with actual locked Week 4 style.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWeek4EditorialModelClient} from '../netlify/functions/inquirer-week4-model-client.mjs';
import {buildWeek4EditorialBatch} from '../netlify/functions/inquirer-week4-batch.mjs';
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';

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
  const [currentPath,week4Path,previousPath,outPath]=process.argv.slice(2);
  if(!currentPath||!week4Path||!previousPath||!outPath||!process.env.EDITORIAL_MODEL){
    console.error('Usage: EDITORIAL_MODEL=<configured model> OPENAI_API_KEY=<server secret> node scripts/generate-week4-style-review.mjs <current-locked.json> <week4-locked.json> <previous-locked.json> <new-review-output.json>');
    process.exitCode=2;
  }else{
    try{
      const [current,week4,previous]=await Promise.all([currentPath,week4Path,previousPath].map(async p=>JSON.parse(await readFile(p,'utf8'))));
      const modelClient=createWeek4EditorialModelClient({apiKey:process.env.OPENAI_API_KEY,baseUrl:process.env.OPENAI_BASE_URL});
      const review=await generateWeek4Review({current,week4,previous,modelClient,model:process.env.EDITORIAL_MODEL});
      await writeFile(outPath,JSON.stringify(review,null,2)+'\n',{flag:'wx',mode:0o600});
      console.log(JSON.stringify({output:outPath,sha256:review.sha256,quality_ok:review.quality.ok,publishable:false}));
    }catch(error){console.error('Editorial review generation failed:',error.message);process.exitCode=1}
  }
}
