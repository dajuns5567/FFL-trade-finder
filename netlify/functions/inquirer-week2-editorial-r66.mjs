import {applyWeek2EditorialR16 as applyR65} from './inquirer-week2-editorial-r65.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);

function playerFromPrevious(paragraphs,i){
  const prev=String(paragraphs?.[i-1]||'');
  const m=prev.match(/^(.+?)\s+scored\s+\d/i);
  return m?.[1]?.trim()||'';
}

function cleanTeam(team){
  const a=team?.inquirer_article;if(!a)return team;
  const s=short(team.team_name);

  const lede=section(a,'lede');
  if(lede?.paragraphs){
    lede.paragraphs=lede.paragraphs.map(p=>String(p||'').replace('That gap matters because it separates a result the lineup merely survived from one it materially outperformed or underperformed.',`For ${s}, that gap separates an ordinary result from one that meaningfully beat or missed the Week 2 expectation.`));
  }

  const players=section(a,'players');
  if(players?.paragraphs){
    players.paragraphs=players.paragraphs.map((p,i)=>{
      const name=playerFromPrevious(players.paragraphs,i)||s;
      return String(p||'')
        .replace('Week 3 is about doing it again.',`${name}'s Week 3 is about doing it again.`)
        .replace('The next game gets to confirm whether this was useful or merely ordinary.',`${name}'s next game gets to confirm whether this was useful or merely ordinary.`)
        .replace('The role was not materially different from the available usage evidence; that makes the Week 3 question about role stability rather than inventing another conclusion from the same three stars.',`For ${s}, the available usage does not show a major role change; Week 3 can test whether that stability continues.`);
    });
  }

  const management=section(a,'management');
  if(management?.paragraphs){
    management.paragraphs=management.paragraphs.map(p=>String(p||'')
      .replace('Judge the lineup on the decisions that actually reached Sunday.',`Judge ${s} on the decisions that actually reached Sunday.`));
  }

  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r66';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR65(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanTeam);
  out.structure_revision='week2-r66';
  if(out.league_overview)out.league_overview.structure_revision='week2-r66';
  return out;
}
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
