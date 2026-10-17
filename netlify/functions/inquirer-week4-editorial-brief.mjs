// The accepted Week 4 edition is a STYLE exemplar, never a source to recycle.
// Model-generated drafts must still pass both publication audits and human
// approval before the separate publication path may read them.
export const REQUIRED_SECTION_KINDS=['lede','players','management','value','sentiment','outlook'];

const paragraphs=article=>(article?.sections||[]).flatMap(s=>s.paragraphs||[]).filter(x=>typeof x==='string');
const exact=number=>Number(number||0).toFixed(2);

export function week4EditorialBrief({team,acceptedWeek4,week}){
  if(Number(acceptedWeek4?.week)!==4||acceptedWeek4?.published_locked!==true||!Array.isArray(acceptedWeek4.teams)||acceptedWeek4.teams.length!==32)
    throw new Error('A complete approved Week 4 edition is required as the sole editorial style reference');
  if(Number(week)<=4)throw new Error('Forward writer cannot mutate Week 1–4');
  const reporter=team?.inquirer_article?.reporter;
  const samples=acceptedWeek4.teams.filter(t=>t?.inquirer_article?.reporter?.id===reporter?.id).slice(0,2)
    .map(t=>({section_samples:(t.inquirer_article.sections||[]).filter(s=>['lede','players','sentiment'].includes(s.kind))
      .map(s=>({kind:s.kind,paragraphs:(s.paragraphs||[]).slice(0,1)}))}));
  if(!samples.length)throw new Error('Week 4 does not contain the assigned reporter');
  const lineup=(team.starter_details||[]).map(p=>({name:p.name,position:p.position,points:p.points,real_stat_line:p.real_stat_line||''}));
  const facts={week:Number(week),team:team.team_name,manager:team.manager_name,opponent:team.opponent_name,
    score:exact(team.points),opponent_score:exact(team.opponent_points),won:!!team.won,
    record:team.league_context?.record||null,division:team.division_name||null,
    next_opponent:team.next_opponent_name||null,top_players:lineup.slice(0,5),
    weakest_starters:lineup.slice(-3),best_lineup_miss:team.best_lineup_miss||null,
    completed_transactions:team.transactions||[],trade_acquisitions:team.trade_acquisitions||[],
    value_movement:team.value_history_week||null,prior_fan_sentiment:team.previous_fan_sentiment||null,
    injury_and_bye_context:team.next_week_availability||null};
  return {system:`You are a passionate fantasy-football newspaper columnist. Write a new Week ${week} story in the sarcastic, blunt, funny, opinionated style demonstrated by the APPROVED WEEK 4 samples. They are examples of rhythm and attitude ONLY. Never lift or paraphrase their sentences, gags, transitions, or section arguments. Do not borrow Weeks 1–3. Write fresh jokes, consequential football judgments, visible fan emotion, and a management spotlight. Embed verified point totals and real-life statistics naturally. Do not invent players, scores, injuries, trades, standings, or quotations. If evidence is missing, omit the allegation. Avoid formulaic top-three lists, numeric lectures, meta-writing, 'eligible option', and repeating 'it was not X; it was Y'. Fans can spray champagne or threaten pitchfork protests when earned by the result. Output ONLY a JSON object with headline, deck, and sections; sections must have kinds lede, players, management, value, sentiment, outlook, each with two or more substantial paragraphs.`,
    user:JSON.stringify({approved_week4_style_samples:samples,current_week_verified_facts:facts})};
}

export function validateWeek4EditorialDraft(draft,team){
  const errors=[];
  if(!draft||typeof draft!=='object')return{ok:false,errors:['not-json-object']};
  if(typeof draft.headline!=='string'||draft.headline.length<20)errors.push('headline');
  const sections=Array.isArray(draft.sections)?draft.sections:[];
  for(const kind of REQUIRED_SECTION_KINDS){
    const matched=sections.filter(x=>x?.kind===kind);
    if(matched.length!==1||!Array.isArray(matched[0].paragraphs)||matched[0].paragraphs.filter(p=>typeof p==='string'&&p.length>=65).length<2)
      errors.push('missing-or-shallow-'+kind);
  }
  const copy=paragraphs(draft).join(' ');
  if(!copy.includes(String(team?.team_name||'')))errors.push('team-identity');
  if(!copy.includes(String(team?.opponent_name||'')))errors.push('opponent-identity');
  if(!copy.includes(Number(team?.points||0).toFixed(1))&&!copy.includes(exact(team?.points)))errors.push('score-identity');
  if(!copy.includes(Number(team?.opponent_points||0).toFixed(1))&&!copy.includes(exact(team?.opponent_points)))errors.push('opponent-score-identity');
  const leadingPlayer=(team?.starter_details||[])[0]?.name;
  if(leadingPlayer&&!copy.includes(String(leadingPlayer)))errors.push('featured-player-identity');
  if(/\b(?:TBD|TODO|lorem ipsum|eligible option|the useful weakness-or-strength note)\b/i.test(copy))errors.push('placeholder-or-meta-prose');
  return{ok:errors.length===0,errors};
}

// Invoked only by a controlled staging worker, never from the public GET
// routes. The caller supplies an authenticated provider SDK client and an
// operator-selected model; no arbitrary user-triggered paid generation.
export async function composeWeek4ArticleDraft({client,model,team,acceptedWeek4,week}){
  if(!client?.chat?.completions?.create||!String(model||'').trim())
    throw new Error('An authenticated server-side model client and configured model are required');
  const brief=week4EditorialBrief({team,acceptedWeek4,week});
  const response=await client.chat.completions.create({
    model,messages:[{role:'system',content:brief.system},{role:'user',content:brief.user}],
    response_format:{type:'json_object'},temperature:0.85
  });
  const source=response?.choices?.[0]?.message?.content;
  let draft;
  try{draft=JSON.parse(String(source||''))}catch{throw new Error('Week 4 editorial model did not return a JSON article')}
  const check=validateWeek4EditorialDraft(draft,team);
  if(!check.ok)throw new Error('Week 4 editorial draft held: '+check.errors.join(', '));
  // Never accept arbitrary model-supplied metadata, badge data, approvals,
  // reporter identities, or other edition fields as authoritative.
  const article={...team.inquirer_article,headline:draft.headline,deck:typeof draft.deck==='string'?draft.deck:'',sections:draft.sections,week:Number(week),
    reporter:team.inquirer_article.reporter,
    paragraphs:paragraphs(draft),editorial_source:'week4-v19-style-ai-draft',
    review_status:'unapproved'};
  return{article,review_status:'unapproved',model:response.model||model,quality:check};
}
