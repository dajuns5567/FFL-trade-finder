from pathlib import Path

editorial_path=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
text=editorial_path.read_text()
start=text.index('function dedupeArticleSentences(t){')
end=text.index('\nfunction recapReaction',start)
replacement=r'''function cleanEditorialMeta(t,sentence){
 let x=String(sentence||'').trim(),tm=String(t?.team_name||'This team');
 if(!x)return'';
 x=x
  .replace(/^No comeback story, no miracle, no inspirational montage\.$/i,tm+' did not need a miracle; the expensive talent simply did the job.')
  .replace(/^That is enough standings material for one loud graphic and several irresponsible predictions\.$/i,tm+' has already given supporters enough confidence to make several irresponsible predictions.')
  .replace(/^The team has been writing them for us\.$/i,tm+' keeps supplying its own punchlines; nobody needs to help.')
  .replace(/^I am writing that sentence without a complaint attached, so please appreciate the sacrifice\.$/i,'I said that about '+tm+' without a complaint attached, so please appreciate the sacrifice.')
  .replace(/^Anybody demanding restraint may read a different column\.$/i,tm+' did not earn restraint, and I see no reason to donate any.')
  .replace(/\bThe next headline asks whether\b/gi,'Week 3 asks whether')
  .replace(/\bmanagement headline\b/gi,'management problem')
  .replace(/\bmade the roster headline concrete\b/gi,'made the roster move concrete')
  .replace(/\bwrong side of the headline\b/gi,'wrong side of the result')
  .replace(/\bthat story survives contact with another scoreboard\b/gi,'that version survives another Sunday')
  .replace(/\bbigger story than another depth percentage\b/gi,'bigger problem than another depth percentage')
  .replace(/\bsaves me from a much grumpier paragraph\b/gi,'saves me from a much grumpier Monday')
  .replace(/\bThere is your headline; the autopsy can take the next several paragraphs\b/gi,'There is the problem; the autopsy can start with every lineup spot that went missing')
  .replace(/\bThat is the headline\b/gi,'That is the number')
  .replace(/\bnot a headline\b/gi,'not a mystery')
  .replace(/\bgives the editor one word in 72-point type: WHY\?/gi,'leaves one useful question: WHY?')
  .replace(/\bclose-call narrative\b/gi,'close call')
  .replace(/\beasy narratives\b/gi,'easy explanations')
  .replace(/\bbelongs in the praise column for\b/gi,'deserves uncomplicated praise for')
  .replace(/\bI refuse to print it\b/gi,'I refuse to respect it')
  .replace(/\brivals did not need to write the joke\b/gi,'rivals did not need to invent the joke');
 return x;
}
function dedupeArticleSentences(t){
 const a=t?.inquirer_article;if(!a)return t;
 const seen=new Set();
 a.sections=(a.sections||[]).map(sec=>({
  ...sec,
  paragraphs:(sec?.paragraphs||[]).map(p=>{
   const kept=sentenceParts(p).map(sentence=>cleanEditorialMeta(t,sentence)).filter(Boolean).filter(sentence=>{
    const key=String(sentence||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(!key||seen.has(key))return false;
    seen.add(key);return true;
   });
   return kept.join(' ').trim();
  }).filter(Boolean)
 }));
 a.paragraphs=a.sections.flatMap(sec=>(sec?.paragraphs||[]).filter(Boolean));
 return t;
}
'''
text=text[:start]+replacement.rstrip()+text[end:]
editorial_path.write_text(text)

smoke_path=Path('scripts/inquirer-week2-voice-r15-smoke.mjs')
smoke=smoke_path.read_text()
tech="const TECH_JOKE_RE=/\\b(?:screenshots?|group chats?|rival chats?|rival threads?|memes?|lineup screen|apps?)\\b/i;"
meta="const EDITORIAL_META_RE=/\\b(?:headline|story|paragraph|editor|narrative|graphic|typeface|print|column|publication|writing|write|written)\\b/i;"
if smoke.count(tech)!=1: raise SystemExit(f'expected one TECH_JOKE_RE marker, found {smoke.count(tech)}')
smoke=smoke.replace(tech,tech+'\n'+meta)
assertion=" assert(!TECH_JOKE_RE.test(text),'Screenshot/chat/meme/app humor returned to Week 2 copy for '+t.team_name);"
meta_assert=" assert(!EDITORIAL_META_RE.test(text),'Newsroom/meta commentary returned to Week 2 copy for '+t.team_name);"
if smoke.count(assertion)!=1: raise SystemExit(f'expected one tech assertion, found {smoke.count(assertion)}')
smoke=smoke.replace(assertion,assertion+'\n'+meta_assert)
smoke_path.write_text(smoke)
