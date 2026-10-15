import {applyWeek2EditorialR16 as applyR54} from './inquirer-week2-editorial-r54.mjs';

function voiceName(section){
 const name=String(section?.reporter?.name||'');
 if(/Nick Swindell/i.test(name))return'nick';
 if(/Tilly Fleecer/i.test(name))return'tilly';
 if(/Bartholomew Roycington/i.test(name))return'bartholomew';
 if(/Jefferson Filch/i.test(name))return'jefferson';
 const id=String(section?.reporter?.id||'');
 return id==='walter-mercer'?'nick':id==='nora-voss'?'jefferson':id==='mack-hollis'?'tilly':'bartholomew';
}

function restoreRecapVoice(overview){
 if(!overview)return overview;
 const voice={
  nick:'I care more about what the scoring changed than the excuse attached to it.',
  tilly:'That gets applause because the scoreboard earned it, not because the copy needed a louder costume.',
  bartholomew:'I can admire a clean result when the scoring underneath it has enough substance to deserve the manners.',
  jefferson:'I would rather test the projection against Sunday than repeat it as if the forecast already happened.'
 };
 overview.sections=(overview.sections||[]).map(section=>{
  const ps=[...(section?.paragraphs||[])];
  if(ps.length){const v=voice[voiceName(section)];if(v&&!ps[0].includes(v))ps[0]=`${ps[0]} ${v}`;}
  return {...section,paragraphs:ps};
 });
 overview.structure_revision='week2-r55';
 return overview;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR54(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.league_overview=restoreRecapVoice(out.league_overview);
 out.structure_revision='week2-r55';
 return out;
}
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
