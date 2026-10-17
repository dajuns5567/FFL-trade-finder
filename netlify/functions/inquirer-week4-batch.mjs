// Offline/staging-only orchestration. No Blob writes or publication entrypoints.
// A failed article or recap holds the *entire* edition for revision.
import {composeWeek4ArticleDraft} from './inquirer-week4-editorial-brief.mjs';
import {inspectEditionBeforePublication} from './inquirer-publication-guard.mjs';
import {evaluateInquirerEditionQuality} from './inquirer-editorial-v31.mjs';

const one=n=>Number(n||0).toFixed(2);
const summaryOf=team=>({team:team.team_name,opponent:team.opponent_name,score:one(team.points),opponent_score:one(team.opponent_points),won:!!team.won,record:team.league_context?.record||null,top_players:(team.starter_details||[]).slice(0,3).map(p=>({name:p.name,points:p.points,real_stat_line:p.real_stat_line||''}))});

// Validate the official snapshot BEFORE spending on 33 model requests. A
// plausible-looking article cannot compensate for missing or contradictory
// scores, roster identities, or matchups in the underlying weekly data.
export function verifyWeeklyEditorialSource(edition){
  const issues=[],teams=edition?.teams||[];
  if(teams.length!==32)issues.push('expected exactly 32 rosters');
  const ids=teams.map(t=>String(t.roster_id));
  if(new Set(ids).size!==32||ids.some(id=>!id||id==='undefined'))issues.push('duplicate or missing roster identifiers');
  const byId=new Map(teams.map(t=>[String(t.roster_id),t]));
  for(const t of teams){
    const id=String(t.roster_id),foe=byId.get(String(t.opponent_roster_id));
    if(!t.team_name||!t.opponent_name||!t.inquirer_article?.reporter?.id)issues.push(id+': team/reporter identity absent');
    if(!Number.isFinite(Number(t.points))||!Number.isFinite(Number(t.opponent_points))||t.points==null||t.opponent_points==null)
      issues.push(id+': invalid official score');
    if(!Array.isArray(t.starter_details)||!t.starter_details.length)issues.push(id+': verified lineup missing');
    if(!foe||String(foe.opponent_roster_id)!==id||foe===t)
      issues.push(id+': matchup is not reciprocal');
    else{
      if(Math.abs(Number(t.points)-Number(foe.opponent_points))>.02||Math.abs(Number(t.opponent_points)-Number(foe.points))>.02)
        issues.push(id+': reciprocal scores disagree');
      if(t.opponent_name!==foe.team_name||foe.opponent_name!==t.team_name)
        issues.push(id+': opponent labels disagree');
      if(Number(t.points)!==Number(foe.points)&&Boolean(t.won)===Boolean(foe.won))
        issues.push(id+': reciprocal winning result disagrees');
    }
  }
  return{ok:issues.length===0,issues};
}

export function week4RecapBrief({edition,acceptedWeek4}){
  if(Number(acceptedWeek4?.week)!==4||acceptedWeek4?.published_locked!==true)
    throw new Error('Locked Week 4 edition required for recap style');
  const examples=(acceptedWeek4.league_overview?.sections||[]).slice(0,3)
    .map(s=>({heading:s.heading,paragraphs:(s.paragraphs||[]).slice(0,1)}));
  if(examples.length<2)throw new Error('Approved Week 4 recap examples missing');
  const preflight=verifyWeeklyEditorialSource(edition);
  if(!preflight.ok)throw new Error('Unverified weekly source: '+preflight.issues.join('; '));
  const byId=new Map((edition.teams||[]).map(t=>[String(t.roster_id),t])),seen=new Set(),games=[];
  for(const team of edition.teams||[]){
    const foe=byId.get(String(team.opponent_roster_id));
    if(!foe)throw new Error('Missing reciprocal opponent for '+team.team_name);
    const id=[String(team.roster_id),String(foe.roster_id)].sort().join('|');
    if(seen.has(id))continue;seen.add(id);
    games.push({team:summaryOf(team),opponent:summaryOf(foe)});
  }
  if(games.length!==16)throw new Error('Complete recap requires 16 verified games');
  return{system:`Write a fresh, sarcastic, passionate, fact-based Fleeced! Inquirer weekly recap. Follow the APPROVED WEEK 4 newspaper writing STYLE only; never copy or paraphrase its sentences, jokes, or claims. Do not draw prose from Weeks 1–3. Cover consequential wins/losses, rivalries, players, bad managerial decisions, division consequences and meaningful hot takes. Weave verified stats into judgments, not explanatory stat lectures. Make jokes original and varied. No invented facts. Output valid JSON: headline, deck, sections (at least 4, each with heading and two substantive paragraphs), and hot_takes (at least 4, each with title and take).`,
    user:JSON.stringify({approved_week4_recap_style_samples:examples,week:edition.week,season:edition.season,verified_games:games})};
}

export async function composeWeek4RecapDraft({client,model,edition,acceptedWeek4}){
  const brief=week4RecapBrief({edition,acceptedWeek4});
  const response=await client.chat.completions.create({model,
    messages:[{role:'system',content:brief.system},{role:'user',content:brief.user}],
    response_format:{type:'json_object'},temperature:0.85});
  let recap;try{recap=JSON.parse(String(response?.choices?.[0]?.message?.content||''))}
  catch{throw new Error('Recap model did not return valid JSON')}
  if(!recap?.headline||!Array.isArray(recap.sections)||recap.sections.length<4
     ||recap.sections.some(s=>!s.heading||!Array.isArray(s.paragraphs)||s.paragraphs.filter(p=>typeof p==='string'&&p.length>=65).length<2)
     ||!Array.isArray(recap.hot_takes)||recap.hot_takes.length<4)
    throw new Error('Incomplete Week 4-style recap draft');
  const reporters=edition.reporters||acceptedWeek4.reporters||[];
  if(reporters.length<4)throw new Error('Four established Inquirer desks required');
  const sections=recap.sections.map((s,i)=>({heading:s.heading,paragraphs:s.paragraphs,reporter:reporters[i%4]}));
  const hot_takes=recap.hot_takes.map((take,i)=>({title:take.title,take:take.take,reporter:reporters[i%4]}));
  return{...edition.league_overview,headline:recap.headline,deck:typeof recap.deck==='string'?recap.deck:'',sections,hot_takes,week:edition.week,season:edition.season,
    editorial_source:'week4-v19-style-ai-draft',review_status:'unapproved'};
}

export async function buildWeek4EditorialBatch({edition,acceptedWeek4,previousEdition,client,model,concurrency=2}){
  if(!edition||Number(edition.week)<=4||edition.teams?.length!==32)
    throw new Error('A complete future-week edition with 32 teams is required');
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)
    throw new Error('Staging concurrency must be 1–4');
  const preflight=verifyWeeklyEditorialSource(edition);
  if(!preflight.ok)throw new Error('Unverified weekly source: '+preflight.issues.join('; '));
  // Validate the accepted style edition before making the first paid request.
  week4RecapBrief({edition,acceptedWeek4});
  const articles=new Array(32);let cursor=0;
  await Promise.all(Array.from({length:Math.min(concurrency,32)},async()=>{
    while(cursor<32){
      const index=cursor++,team=edition.teams[index];
      const result=await composeWeek4ArticleDraft({client,model,team,acceptedWeek4,week:edition.week});
      articles[index]={...team,inquirer_article:result.article};
    }
  }));
  const candidate={...edition,teams:articles,league_overview:await composeWeek4RecapDraft({client,model,edition:{...edition,teams:articles},acceptedWeek4}),published_locked:false};
  const structural=inspectEditionBeforePublication(candidate),deep=evaluateInquirerEditionQuality(candidate,previousEdition||null);
  return{edition:candidate,review_status:'unapproved',publishable:false,
    quality:{ok:structural.ok&&deep.ok,structural,deep}};
}
