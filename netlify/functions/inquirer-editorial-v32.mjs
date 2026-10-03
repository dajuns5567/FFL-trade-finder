import {
  applyInquirerEditorialV31 as applyV31,
  evaluateInquirerEditionQuality,
  FORWARD_INQUIRER_VERSION,
  FORWARD_EDITORIAL_REVISION
} from './inquirer-editorial-v31.mjs';

export {evaluateInquirerEditionQuality,FORWARD_INQUIRER_VERSION,FORWARD_EDITORIAL_REVISION};

const sentenceList=text=>String(text||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);

function cleanForwardLanguage(text){
  return String(text||'')
    .replace(/The part rival managers will screenshot is this:/gi,'The part rival managers will remember is this:')
    .replace(/This is the sentence the group chat will keep:/gi,'This is the point rival managers will keep repeating:')
    .replace(/Save the screenshot; the next game gets a vote\./gi,'Save the bragging; the next game gets a vote.')
    .replace(/That one is going straight into the group chat\./gi,'Rival managers will be repeating that one all week.')
    .replace(/Elegant or not, the score keeps the receipt\./gi,'Elegant or not, the score keeps the answer.')
    .replace(/If it repeats, the headline gets bigger\./gi,'If it repeats, the argument gets stronger.')
    .replace(/If it disappears, we will happily print the correction\./gi,'If it disappears, we will happily admit the correction.')
    .replace(/Nobody is mathematically buried by a newspaper sentence/gi,'Nobody is mathematically buried by one bad week')
    .replace(/the article should say so plainly/gi,'that is the plain reality')
    .replace(/a playoff-race article pretending otherwise/gi,'a playoff race pretending otherwise')
    .replace(/The back-page version is simple:/gi,'The loud version is simple:')
    .replace(/The useful football answer is simpler:/gi,'The football answer is simpler:')
    .replace(/The useful weakness-or-strength note is this:/gi,'The weakness-or-strength note is this:')
    .replace(/Even a dramatic Sunday can be reduced to one useful point:/gi,'Even a dramatic Sunday can be reduced to one football point:')
    .replace(/The point is useful precisely because it can be tested again\./gi,'The point matters because it can be tested again.')
    .replace(/same useful players/gi,'same productive players')
    .replace(/useful form/gi,'repeatable form')
    .replace(/The useful lesson is not/gi,'The lesson is not')
    .replace(/what the receipt said that day/gi,'what the recorded value said that day')
    .replace(/The receipt was not subtle:/gi,'The recorded value was not subtle:')
    .replace(/\breceipt\b/gi,'record')
    .replace(/\bgroup chat\b/gi,'rival chatter')
    .replace(/\bscreenshot\b/gi,'remember')
    .replace(/\bheadline\b/gi,'claim');
}

function suppressRoutineSnapShare(section){
  if(!section||String(section?.kind||'')!=='players'||!Array.isArray(section.paragraphs))return;
  const meaningful=/\b(?:week 1|last week|last season|2025|prior|usual|normal|typical|career|rose|fell|jumped|dropped|increased|decreased|up from|down from|higher|lower|changed|shifted|injur|limited|return|rotation|competition|breakout|role lift|opportunity increased)\b/i;
  const snap=/\b(?:snap share|\d+\s+snaps|snaps per game)\b/i;
  section.paragraphs=section.paragraphs.map(p=>sentenceList(p).filter(s=>!(snap.test(s)&&!meaningful.test(s))).join(' ')).filter(Boolean);
}

function refineTeam(team){
  const article=team?.inquirer_article;
  if(!article)return team;
  for(const section of article.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(cleanForwardLanguage);
    suppressRoutineSnapShare(section);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.future_editorial_policy='v32-natural-voice-snap-relevance';
  return team;
}

function refineOverview(overview){
  if(!overview)return overview;
  for(const section of overview.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(cleanForwardLanguage);
    if(section?.heading)section.heading=cleanForwardLanguage(section.heading);
  }
  if(Array.isArray(overview.hot_takes))overview.hot_takes=overview.hot_takes.map(h=>({...h,title:cleanForwardLanguage(h?.title),take:cleanForwardLanguage(h?.take)}));
  overview.future_editorial_policy='v32-natural-voice-snap-relevance';
  return overview;
}

export function applyInquirerEditorialV31(args={}){
  const out=applyV31(args);
  const week=Number(args?.week??out?.week);
  if(!out||week<=2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  if(out.league_overview)out.league_overview=refineOverview(out.league_overview);
  out.future_editorial_policy='v32-natural-voice-snap-relevance';
  return out;
}

export const applyInquirerEditorialV32=applyInquirerEditorialV31;
