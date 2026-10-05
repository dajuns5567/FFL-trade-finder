import {applyWeek2EditorialR16 as applyR169W} from './inquirer-week2-editorial-r169w.mjs';

const CANNED=/That is dominance from the top and a warning label for everybody beneath it:\s*three people should not have to carry the grocery bags, the couch, and the fantasy team at the same time([.;])/g;
const escapeRe=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function rewriteTopHeavyScoring(text,team,article){
  const club=String(team?.team_name||'this team'),short=club.split(/\s+/).filter(Boolean).at(-1)||club,who=String(article?.reporter?.name||'Nick Swindell'),poss=/s$/i.test(short)?`${short}'`:`${short}'s`;
  return String(text||'').replace(CANNED,(_match,punctuation)=>{
    let replacement;
    if(who==='Tilly Fleecer')replacement=`${short} got the expensive seats right and left the rest of the lineup looking like it wandered in after intermission. Wonderful for the stars; mildly humiliating for everyone underneath them`;
    else if(who==='Bartholomew Roycington III')replacement=`${poss} best performers handled the aristocratic burden splendidly, while the lower order supplied enough mediocrity to keep the household from becoming unbearably pleased with itself`;
    else if(who==='Jefferson Filch')replacement=`${poss} top-end production did the heavy lifting. The rest of the lineup now has to contribute enough that the stars are not required to win the case by themselves every week`;
    else replacement=`${poss} best players did their jobs. The rest of the lineup owns the obvious problem: stop making the top of the roster cover for everybody else`;
    return replacement+punctuation;
  });
}

function removeInjectedFollowups(text,team){
  const short=String(team?.team_name||'this team').split(/\s+/).filter(Boolean).at(-1)||'this team';
  const shortRe=escapeRe(short);
  const obvious=new RegExp(`^(?:for ${shortRe},|${shortRe} (?:gets?|can)\\b|the ${shortRe} version\\b|.+? gives ${shortRe} a direct follow-up\\b)`,'i');
  const marker=/\b(?:next useful football test|get(?:s)? a cleaner read|get(?:s)? another football answer|can test that immediately|direct follow-up|Week 3 work against|weekly role and production against|rushing workload.+Week 3|target and receiving volume.+Week 3|defensive disruption survives the matchup)\b/i;
  const pieces=String(text||'').split(';');
  if(pieces.length===1)return String(text||'');
  const kept=[pieces[0].trim()];
  for(const raw of pieces.slice(1)){
    const piece=raw.trim();
    if(!piece)continue;
    if(obvious.test(piece)||marker.test(piece))continue;
    kept.push(piece);
  }
  return kept.join('; ');
}

function restoreTradeAcquisitionContext(text,team){
  let out=String(text||'');
  if(!/\b(?:outscored|bench|compatible bench spot)\b/i.test(out)||/\b(?:trade acquisition|acquired (?:by|via) trade)\b/i.test(out))return out;
  for(const acquisition of team?.trade_acquisitions||[]){
    const name=String(acquisition?.player_name||acquisition?.name||'').trim();
    if(!name||!out.includes(name))continue;
    out=out.replace(name,`Trade acquisition ${name}`);
    break;
  }
  return out;
}

function fixArticleMetaAndGrammar(text,team,section){
  let out=removeInjectedFollowups(text,team);
  const full=String(team?.team_name||'').trim(),short=full.split(/\s+/).filter(Boolean).at(-1)||'',plural=/s$/i.test(short);
  out=out.replace(/Both thoughts can fit in the same paragraph\.?/gi,'Both things are true, and neither needs a committee meeting.');
  out=out.replace(/That performance belongs in the same sentence as the first one\.\s*/gi,'');
  out=out.replace(/Two weeks is early, but standings are already old enough to annoy somebody; lose it and one loud Sunday starts looking like a cameo\.?/gi,'');
  out=out.replace(/I'm not asking for pessimism;\s*he is asking everyone/gi,"I'm not asking for pessimism; I'm asking everyone");
  out=out.replace(/I have no objection to a hero;\s*he objects when/gi,'I have no objection to a hero; I object when');
  if(plural){
    const subject=`(?:${escapeRe(full)}|${escapeRe(short)})`;
    const verbs={needs:'need',gets:'get',looks:'look',makes:'make',keeps:'keep',faces:'face',wants:'want'};
    out=out.replace(new RegExp(`\\b(${subject})\\s+(?:(now|also)\\s+)?(needs|gets|looks|makes|keeps|faces|wants)\\b`,'gi'),(_m,name,adv,verb)=>`${name} ${adv?adv+' ':''}${verbs[String(verb).toLowerCase()]||verb}`);
  }
  if(String(section?.kind||'').toLowerCase()==='sentiment'&&/^I note the fan base has already reached a verdict/i.test(out)){
    out=`${short} fans reached a verdict before the facts finished parking. Now they are shopping for evidence that agrees with them, which is cheaper than admitting the panic might have been premature.`;
  }
  out=restoreTradeAcquisitionContext(out,team);
  out=out.replace(/\s+([,.!?])/g,'$1').replace(/\.{2,}/g,'.').replace(/;\s*\./g,'.').trim();
  return out;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169W(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>fixArticleMetaAndGrammar(rewriteTopHeavyScoring(paragraph,team,article),team,section)).filter(Boolean);
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169X=applyWeek2EditorialR16;
