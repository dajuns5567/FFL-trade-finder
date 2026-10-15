import {applyWeek2EditorialR16 as applyR158} from './inquirer-week2-editorial-r158.mjs';

const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)}%`:'n/a';
const num=v=>Number.isFinite(Number(v))?Number(v).toFixed(1).replace(/\.0$/,''):'n/a';
const rec=t=>{const r=t?.league_context?.record||{};return`${Number(r.wins)||0}-${Number(r.losses)||0}`;};

function boardLineData(out){
  const teams=out?.teams||[];
  const by=n=>teams.find(t=>String(t?.team_name||'')===n);
  const po=n=>pct(by(n)?.mida_outlook?.playoff);
  const title=n=>pct(by(n)?.mida_outlook?.title);
  const score=n=>num(by(n)?.points);
  return[
    `AFC EAST: New England Patriots (${rec(by('New England Patriots'))}) — Miami just answered with ${score('Miami Dolphins')} in Week 2 and MIDA has the Dolphins around ${po('Miami Dolphins')} for the playoffs. New England owns the standings; Miami has the model pounding on the door. Nice little argument already.`,
    `AFC NORTH: Baltimore Ravens / Cleveland Browns (${rec(by('Baltimore Ravens'))}) — both are unbeaten, but MIDA separates them at roughly ${po('Baltimore Ravens')} and ${po('Cleveland Browns')} playoff odds. Same record, very different level of trust. September loves paperwork like this.`,
    `AFC SOUTH: Tennessee Titans (${rec(by('Tennessee Titans'))}) — first place is real after only ${score('Tennessee Titans')} points in Week 2, while MIDA still sits around ${po('Tennessee Titans')}. Dominance is a much funnier claim.`,
    `AFC WEST: Denver Doncos (${rec(by('Denver Doncos'))}) — Denver owns the clean record and MIDA sits around ${po('Denver Doncos')}, while the Chargers are still near ${po('Los Angeles Chargers')}. The standings favor Denver; the division has not agreed to become simple.`,
    `NFC EAST: Philadelphia Eagles / Dallas Cowboys (${rec(by('Philadelphia Eagles'))}) — both are unbeaten, yet MIDA has Philadelphia around ${po('Philadelphia Eagles')} and Dallas around ${po('Dallas Cowboys')}. Same record, different résumé. Dallas can complain to the spreadsheet after it wins again.`,
    `NFC NORTH: Minnesota Vikings / Detroit Lions / Chicago Bears (${rec(by('Minnesota Vikings'))}) — nobody owns a record advantage, so Minnesota's ${score('Minnesota Vikings')}-point Week 2 and ${po('Minnesota Vikings')} MIDA playoff odds provide the first useful separator. Everyone else still gets to argue because nobody has earned silence.`,
    `NFC SOUTH: New Orleans Aints (${rec(by('New Orleans Aints'))}) — ${score('New Orleans Aints')} in Week 2, about ${po('New Orleans Aints')} playoff odds and ${title('New Orleans Aints')} title odds give the Aints the rare early luxury of the standings and MIDA telling the same story.`,
    `NFC WEST: Arizona Cardinals (${rec(by('Arizona Cardinals'))}) — Arizona scored ${score('Arizona Cardinals')} in Week 2, but MIDA still has the Cardinals around ${po('Arizona Cardinals')} while San Francisco sits near ${po('San Francisco 49ers')}. Arizona owns September; the model is not surrendering the long view yet.`
  ];
}

function formatDivisionBoard(out){
  const overview=out?.league_overview;if(!overview)return;
  const lines=boardLineData(out);
  const board=(overview.hot_takes||[]).find(x=>/division board/i.test(String(x?.title||'')));
  if(board)board.take=lines.join('\n');
  const section=(overview.sections||[]).find(s=>/division board/i.test(String(s?.heading||'')));
  if(section)section.paragraphs=lines;
  overview.structure_revision='week2-r159';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR158(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  formatDivisionBoard(out);
  out.structure_revision='week2-r159';
  return out;
}

export const applyWeek2EditorialR159=applyWeek2EditorialR16;
export const applyWeek2EditorialR158=applyWeek2EditorialR16;
export const applyWeek2EditorialR157=applyWeek2EditorialR16;
export const applyWeek2EditorialR156=applyWeek2EditorialR16;
export const applyWeek2EditorialR155=applyWeek2EditorialR16;
export const applyWeek2EditorialR154=applyWeek2EditorialR16;
export const applyWeek2EditorialR153=applyWeek2EditorialR16;
export const applyWeek2EditorialR152=applyWeek2EditorialR16;
export const applyWeek2EditorialR151=applyWeek2EditorialR16;
export const applyWeek2EditorialR150=applyWeek2EditorialR16;
export const applyWeek2EditorialR149=applyWeek2EditorialR16;
export const applyWeek2EditorialR148=applyWeek2EditorialR16;
export const applyWeek2EditorialR147=applyWeek2EditorialR16;
export const applyWeek2EditorialR146=applyWeek2EditorialR16;
export const applyWeek2EditorialR145=applyWeek2EditorialR16;
export const applyWeek2EditorialR144=applyWeek2EditorialR16;
export const applyWeek2EditorialR143=applyWeek2EditorialR16;
export const applyWeek2EditorialR142=applyWeek2EditorialR16;
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
