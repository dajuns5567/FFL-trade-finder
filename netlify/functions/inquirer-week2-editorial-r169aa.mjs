import {applyWeek2EditorialR16 as applyR169Z} from './inquirer-week2-editorial-r169z.mjs';
import {applyInquirerSignalLanguageToEdition} from './inquirer-signal-language.mjs';

export function applyWeek2EditorialR16(raw){
  const out=applyR169Z(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  applyInquirerSignalLanguageToEdition(out,{season:2026,week:2,previousEdition:null});
  return out;
}

export const applyWeek2EditorialR169AA=applyWeek2EditorialR16;
