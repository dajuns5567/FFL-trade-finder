import {applyWeek2EditorialR16 as applyR140} from './inquirer-week2-editorial-r140.mjs';

function formatRenderedDivisionBoard(overview){
  if(!Array.isArray(overview?.hot_takes))return;
  const board=overview.hot_takes.find(x=>/division board/i.test(String(x?.title||'')));
  if(!board)return;
  board.take=`The division board after two weeks:\n\nAFC EAST: New England Patriots (2-0) — Miami just detonated a 142.4-point Week 2. New England owns the record; Miami owns the score that makes the rest of the division stare at the ceiling for a minute.\nAFC NORTH: Baltimore Ravens / Cleveland Browns (2-0) — Their Week 2 totals were 69.4 and 54.5. Two perfect records, neither of which should be mistaken for an offensive parade.\nAFC SOUTH: Tennessee Titans (2-0) — Tennessee scored 56 in Week 2 with Indianapolis at 1-1. The Titans have the lead and a scoring total that politely asks everyone not to get carried away.\nAFC WEST: Denver Doncos (2-0) — Denver scored 88.7 in Week 2 while the Chargers sit 1-1. The Doncos have earned first place; the division has not yet agreed to become boring.\nNFC EAST: Philadelphia Eagles / Dallas Cowboys (2-0) — Philadelphia scored 100 and Dallas won by 65.8, so this pair of perfect records at least arrived with enough muscle to avoid an immediate cross-examination.\nNFC NORTH: Minnesota Vikings / Detroit Lions / Chicago Bears (1-1) — Minnesota's 121.1 was the best Week 2 score of the three, which is currently the closest thing this division has to somebody grabbing the steering wheel.\nNFC SOUTH: New Orleans Aints (2-0) — The Aints scored 115.8 in Week 2 and carry the strongest two-week scoring case among the division leaders. Atlanta is 1-1; right now New Orleans has the record and the better argument.\nNFC WEST: Arizona Cardinals (2-0) — Arizona scored 123.6 in Week 2 with the Rams at 1-1. The Cardinals have a clean record plus a real scoring flex, which is considerably more convincing than simply being undefeated and hoping nobody checks the math.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR140(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  formatRenderedDivisionBoard(out.league_overview);
  if(out.league_overview)out.league_overview.structure_revision='week2-r141';
  out.structure_revision='week2-r141';
  return out;
}

export const applyWeek2EditorialR141=applyWeek2EditorialR16;
export const applyWeek2EditorialR140=applyWeek2EditorialR16;
export const applyWeek2EditorialR139=applyWeek2EditorialR16;
export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
