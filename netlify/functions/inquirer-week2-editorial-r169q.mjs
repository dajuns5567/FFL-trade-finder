import {applyWeek2EditorialR16 as applyR169P} from './inquirer-week2-editorial-r169p.mjs';

const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const shortTeam=t=>String(t?.team_name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'this team';
const topStarter=t=>(t?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0]||{};

function footballFocus(p){
  const line=String(p?.real_stat_line||'').toLowerCase();
  if(/target|rec|receiv/.test(line))return 'target and receiving volume';
  if(/carr|rush/.test(line))return 'rushing workload';
  if(/sack|tfl|qb hit|tackle|interception|forced fumble/.test(line))return 'defensive disruption';
  if(/pass|cmp|att/.test(line))return 'passing efficiency and volume';
  return 'weekly role and production';
}

function contextualize(base,team,variant){
  const p=topStarter(team),player=String(p?.name||'the leading scorer'),opp=String(team?.next_opponent_name||'the Week 3 opponent'),club=shortTeam(team),focus=footballFocus(p);
  const core=String(base||'').replace(/[.!?]+$/,'');
  const tails=[
    `; for ${club}, ${player}'s ${focus} against ${opp} is the next useful football test.`,
    `; ${club} gets a cleaner read when ${player} takes that ${focus} into Week 3 against ${opp}.`,
    `; the ${club} version now depends on whether ${player}'s ${focus} survives the matchup with ${opp}.`,
    `; ${player}'s Week 3 work against ${opp} will tell ${club} how much of that ${focus} actually lasts.`,
    `; ${club} can test that immediately through ${player}'s ${focus} when ${opp} arrives next.`,
    `; ${opp} gives ${club} a direct follow-up on whether ${player}'s ${focus} is becoming dependable.`,
    `; ${club} gets another football answer when ${player}'s ${focus} meets ${opp} next week.`,
    `; ${player} facing ${opp} is where ${club} finds out whether that ${focus} was a spike or a real step forward.`
  ];
  return core+tails[variant%tails.length];
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169P(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const seen=new Map();
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;if(!article)continue;
    for(const section of article.sections||[]){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(paragraph=>sentenceParts(paragraph).map(sentence=>{
        if(words(sentence)<8)return sentence;
        const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();
        const count=seen.get(key)||0;seen.set(key,count+1);
        return count===0?sentence:contextualize(sentence,team,count-1);
      }).join(' '));
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169Q=applyWeek2EditorialR16;
