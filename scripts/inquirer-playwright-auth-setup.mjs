// One-time local operator action. Never run in CI: requires visible SSO login.
// Captures only an authenticated Playwright context and submits it directly to
// GitHub Actions encrypted secrets via gh stdin, without writing cookie files.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const repo='dajuns5567/FFL-trade-finder';
const preview='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/?inquirer_preview=1&preview_week=5';
const secret='FLEECED_PLAYWRIGHT_STORAGE_STATE_B64';
const gh=spawnSync('gh',['auth','status'],{stdio:'ignore'});
if(gh.status!==0)throw Error('Install and authenticate GitHub CLI (gh auth login) before running this local operator script.');
const browser=await chromium.launch({headless:false});
try {
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.goto(preview,{waitUntil:'domcontentloaded',timeout:60000});
 console.log('Sign in to the protected Netlify preview in the Playwright browser window.');
 const rl=createInterface({input:stdin,output:stdout});
 try {await rl.question('Once Week 5 Inquirer is visibly loaded, press Enter to verify access: ');}
 finally {rl.close();}
 const actual=new URL(page.url());
 const text=await page.locator('body').innerText({timeout:20000});
 if(actual.host!=='deploy-preview-402--transcendent-manatee-2f0123.netlify.app'||!/week\s*5/i.test(text)||!/inquirer/i.test(text))
  throw Error('Playwright cannot confirm the protected Week 5 Inquirer. No secret was created.');
 const state=await context.storageState();
 if(!state.cookies.length&&!state.origins.length)throw Error('No browser session data was captured. No secret was created.');
 const encoded=Buffer.from(JSON.stringify(state)).toString('base64');
 const result=spawnSync('gh',['secret','set',secret,'--repo',repo],{input:encoded,encoding:'utf8',stdio:['pipe','pipe','pipe']});
 if(result.status!==0)throw Error('GitHub secret upload failed: '+String(result.stderr||'').slice(0,250));
 console.log('Encrypted repository secret saved. Do not paste browser-state data into chat, logs, or issues.');
 console.log('Run workflow "Authenticated Week 5 Playwright verification" manually on PR #404 branch.');
} finally {await browser.close();}
