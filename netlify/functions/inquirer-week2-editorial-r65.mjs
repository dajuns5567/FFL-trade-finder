import {applyWeek2EditorialR16 as applyR64} from './inquirer-week2-editorial-r64.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const week1=t=>(t?.league_context?.recent_games||[]).find(g=>Number(g?.week)===1);

function personalizeDistribution(team,players){
  if(!players?.paragraphs?.length)return;
  const i=players.paragraphs.length-1,text=String(players.paragraphs[i]||'');
  if(!/combined for|points came from|gave this lineup|points from|supplied|produced|lineup collected|trio of|accounted for|usable leads|three highest week 2 starters/i.test(text))return;
  const parts=text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if(parts.length>1&&!parts[1].toLowerCase().includes(short(team.team_name).toLowerCase())){
    parts[1]=`For ${short(team.team_name)}, ${parts[1].charAt(0).toLowerCase()}${parts[1].slice(1)}`;
  }
  players.paragraphs[i]=parts.join(' ');
}

function cleanTeam(team){
  const a=team?.inquirer_article;if(!a)return team;
  const s=short(team.team_name),w1=week1(team),w2=Number(team.points),w1pts=Number(w1?.points),direction=Number.isFinite(w1pts)?(w2>w1pts?'rose':w2<w1pts?'fell':'held steady'):'is still forming';
  const lede=section(a,'lede');
  if(lede?.paragraphs?.length){
    lede.paragraphs=lede.paragraphs.map(p=>String(p||'').replace('Two games do not settle the season, but they do give the next decision a real baseline.',`For ${s}, scoring ${direction} from Week 1 to Week 2; Week 3 will show whether that movement holds.`));
    if(lede.paragraphs.length>=3){
      const voice=String(a?.reporter?.name||'');
      const endings={
        'Nick Swindell':`For ${s}, Week 3 is a simple test: preserve what worked in Week 2 and make the scoring direction prove it can hold.`,
        'Tilly Fleecer':`${s} gets one Week 2 result and one Week 3 dare: do the useful part again before anybody writes a speech.`,
        'Bartholomew Roycington III':`${s} may keep the Week 2 lesson without embalming it; Week 3 can decide whether the result deserves a longer life.`,
        'Jefferson Filch':`${s} leaves Week 2 with a usable lead and an open Week 3 question; the next game gets to confirm what survives inspection.`
      };
      lede.paragraphs[2]=endings[voice]||endings['Nick Swindell'];
    }
  }

  const sentiment=section(a,'sentiment');
  if(sentiment?.paragraphs){
    sentiment.paragraphs=sentiment.paragraphs.map(p=>String(p||'').replace('The fan reaction should stay tied to what happened on the field; there is no need to manufacture a lineup scandal where the evidence does not support one.',`${s} supporters should keep the reaction tied to what happened on the field; this week does not supply evidence for a manufactured lineup scandal.`));
  }

  const management=section(a,'management');
  if(management?.paragraphs){
    management.paragraphs=management.paragraphs.map(p=>String(p||'')
      .replace('Week 3 management should focus on role changes and availability instead of fixing a mistake that did not actually happen.',`${s} management should use Week 3 to track role changes and availability instead of correcting a mistake that Week 2 did not actually show.`)
      .replace('No trade acquisition needs to be forced into the Week 2 explanation. The lineup should be judged on the decisions that actually reached Sunday.',`For ${s}, no trade acquisition needs to be forced into the Week 2 explanation. Judge the lineup on the decisions that actually reached Sunday.`));
    const acq=(team.trade_acquisitions||[])[0];
    if(acq?.player_name){
      management.paragraphs=management.paragraphs.map(p=>String(p||'')
        .replace('That acquisition reached the Week 2 starting lineup, so its production belongs in the management evaluation.',`${acq.player_name} reached the Week 2 starting lineup, so that production belongs in ${s}' management evaluation.`)
        .replace('The player did not define the Week 2 starting lineup, so the trade should not be blamed or praised for decisions it did not affect.',`${acq.player_name} did not define the Week 2 starting lineup, so that trade should not be blamed or praised for decisions it did not affect.`));
    }
  }

  const value=section(a,'value');
  if(value?.paragraphs){
    value.paragraphs=value.paragraphs.map(p=>String(p||'')
      .replace('That move matters because it changes the roster’s optionality, not because green numbers are inherently persuasive.',`For ${s}, that move matters because it changes roster options, not because a green number deserves applause.`)
      .replace('The drop is a signal to watch, not a sentence on the player.',`For ${s}, that drop is something to watch, not a sentence on the player.`));
  }

  const hot=section(a,'hot-seat');
  if(hot?.paragraphs){
    const wp=team?.worst_starter?.name||s;
    hot.paragraphs=hot.paragraphs.map(p=>String(p||'')
      .replace('That usage context is the reason to watch the next game before turning one weak fantasy total into a role crisis.',`${wp}'s usage is the reason to watch the next game before turning one weak fantasy total into a role crisis.`)
      .replace('Week 3 should answer whether the weak result was temporary or whether the role itself needs another look.',`${wp}'s Week 3 should answer whether the weak result was temporary or whether the role itself needs another look.`)
      .replace('No single starter deserves a fabricated crisis after Week 2.',`${s} does not have a single starter who deserves a fabricated crisis after Week 2.`)
      .replace('The next game gets to create its own problem if necessary.',`${s} can let the next game create a new problem if one actually appears.`));
  }

  const outlook=section(a,'outlook');
  if(outlook?.paragraphs){
    const next=String(team.next_opponent_name||'the Week 3 opponent');
    outlook.paragraphs=outlook.paragraphs.map(p=>String(p||'')
      .replace('That recent form gives Week 3 context beyond the projection line.',`${next}'s recent form gives ${s} context beyond the Week 3 projection line.`)
      .replace('That is enough schedule context to plan around without pretending future matchups have already been played.',`For ${s}, that is enough schedule context to plan around without pretending future matchups have already been played.`));
  }

  personalizeDistribution(team,section(a,'players'));
  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r65';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR64(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanTeam);
  out.structure_revision='week2-r65';
  if(out.league_overview)out.league_overview.structure_revision='week2-r65';
  return out;
}
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
