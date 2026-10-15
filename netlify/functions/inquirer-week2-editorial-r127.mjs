import {applyWeek2EditorialR16 as applyR126} from './inquirer-week2-editorial-r126.mjs';

const n=v=>Number(v);
const fmt=v=>{const x=n(v);return Number.isFinite(x)?x.toFixed(1).replace(/\.0$/,''):'';};
const styleOf=article=>{
  const name=String(article?.reporter?.name||'Nick Swindell');
  if(name==='Tilly Fleecer')return 'tilly';
  if(name==='Bartholomew Roycington III')return 'bartholomew';
  if(name==='Jefferson Filch')return 'jefferson';
  return 'nick';
};
const hasHistorical=(article,player)=>{
  const name=String(player?.name||''),bits=name.split(/\s+/).filter(Boolean),first=bits[0]||'',last=bits.at(-1)||'';
  const refs=[name,first.length>=4?first:'',last.length>=4?last:''].filter(Boolean);
  const paragraphs=(article?.paragraphs||[]).map(String);
  return paragraphs.some(p=>/\b(?:2025|last season|last year|prior-season)\b/i.test(p)&&refs.some(ref=>p.toLowerCase().includes(ref.toLowerCase())));
};

function historySentence(player,style,slot){
  const name=String(player?.name||'Player'),prior=fmt(player?.prior_season_avg),pts=n(player?.points),base=n(player?.prior_season_avg),above=pts>=base;
  const direction=above?'above':'below';
  const move=above?'jump':'drop';
  const louder=above?'stronger':'quieter';
  const rows={
    nick:[
      `${name} averaged ${prior} fantasy points in 2025, so Week 2 landed well ${direction} the level carried through last season.`,
      `For ${name}, the useful historical comparison is ${prior} points per game in 2025; this Sunday was a clear ${move} from that mark.`,
      `${name}'s 2025 average was ${prior}, putting this Week 2 total meaningfully ${direction} the prior-season norm.`
    ],
    tilly:[
      `${name} averaged ${prior} in 2025, so Week 2 was not a tiny wobble; it was a real ${move} from last season's output.`,
      `Last season, ${name} averaged ${prior} points per game; this week's number moved far enough ${direction} that to get my attention.`,
      `${name} averaged ${prior} in 2025, making Week 2 a much ${louder} Sunday than the usual result last season.`
    ],
    bartholomew:[
      `${name} averaged ${prior} in 2025; Week 2 was a meaningful ${move} from that prior-season output.`,
      `The 2025 comparison for ${name} is ${prior} points per game, which makes this Week 2 result plainly unusual.`,
      `${name}'s 2025 average was ${prior}; this performance sat materially ${direction} it.`
    ],
    jefferson:[
      `${name} entered 2026 after averaging ${prior} in 2025; Week 2 landed well ${direction} that mark.`,
      `In 2025, ${name} averaged ${prior}; this Sunday moved far enough ${direction} that history to deserve notice.`,
      `${name} averaged ${prior} last season, so the Week 2 number was a real departure from the 2025 range.`
    ]
  };
  return (rows[style]||rows.nick)[slot]||rows.nick[0];
}

function refine(team){
  const article=team?.inquirer_article;if(!article)return team;
  const players=(article.sections||[]).find(s=>s?.kind==='players');
  if(!players||!Array.isArray(players.paragraphs))return team;
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  const style=styleOf(article),top=(team?.starter_details||[]).slice(0,3);
  top.forEach((player,slot)=>{
    const prior=n(player?.prior_season_avg),pts=n(player?.points),games=n(player?.prior_season_games)||0;
    if(!Number.isFinite(prior)||prior<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-prior)<Math.max(4,prior*.3)||hasHistorical(article,player))return;
    const idx=Math.min(slot*2+1,players.paragraphs.length-1);
    players.paragraphs[idx]=`${String(players.paragraphs[idx]||'').trim()} ${historySentence(player,style,slot)}`.trim();
    article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  });
  article.structure_revision='week2-r127';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR126(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r127';
  if(out.league_overview)out.league_overview.structure_revision='week2-r127';
  return out;
}
export const applyWeek2EditorialR127=applyWeek2EditorialR16;
export const applyWeek2EditorialR126=applyWeek2EditorialR16;
export const applyWeek2EditorialR125=applyWeek2EditorialR16;
export const applyWeek2EditorialR124=applyWeek2EditorialR16;
export const applyWeek2EditorialR123=applyWeek2EditorialR16;
export const applyWeek2EditorialR122=applyWeek2EditorialR16;
export const applyWeek2EditorialR121=applyWeek2EditorialR16;
export const applyWeek2EditorialR120=applyWeek2EditorialR16;
export const applyWeek2EditorialR119=applyWeek2EditorialR16;
export const applyWeek2EditorialR118=applyWeek2EditorialR16;
export const applyWeek2EditorialR117=applyWeek2EditorialR16;
export const applyWeek2EditorialR116=applyWeek2EditorialR16;
export const applyWeek2EditorialR115=applyWeek2EditorialR16;
export const applyWeek2EditorialR114=applyWeek2EditorialR16;
export const applyWeek2EditorialR113=applyWeek2EditorialR16;
export const applyWeek2EditorialR112=applyWeek2EditorialR16;
export const applyWeek2EditorialR111=applyWeek2EditorialR16;
export const applyWeek2EditorialR110=applyWeek2EditorialR16;
export const applyWeek2EditorialR109=applyWeek2EditorialR16;
export const applyWeek2EditorialR108=applyWeek2EditorialR16;
export const applyWeek2EditorialR107=applyWeek2EditorialR16;
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
export const applyWeek2EditorialR82=applyWeek2EditorialR16;
export const applyWeek2EditorialR81=applyWeek2EditorialR16;
export const applyWeek2EditorialR80=applyWeek2EditorialR16;
export const applyWeek2EditorialR79=applyWeek2EditorialR16;
export const applyWeek2EditorialR78=applyWeek2EditorialR16;
export const applyWeek2EditorialR77=applyWeek2EditorialR16;
export const applyWeek2EditorialR76=applyWeek2EditorialR16;
export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
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
