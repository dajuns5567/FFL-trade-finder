import {applyWeek2EditorialR16 as applyR169W} from './inquirer-week2-editorial-r169w.mjs';

const CANNED=/That is dominance from the top and a warning label for everybody beneath it:\s*three people should not have to carry the grocery bags, the couch, and the fantasy team at the same time([.;])/g;
const escapeRe=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

function reporterVoice(article){
  const name=String(article?.reporter?.name||'Nick Swindell');
  if(name==='Tilly Fleecer')return'tilly';
  if(name==='Bartholomew Roycington III')return'roycington';
  if(name==='Jefferson Filch')return'filch';
  return'nick';
}

function teamBits(team){
  const full=String(team?.team_name||'this team').trim();
  const short=full.split(/\s+/).filter(Boolean).at(-1)||full;
  const poss=/s$/i.test(short)?`${short}'`:`${short}'s`;
  return{full,short,poss};
}

function voiceLine(article,key){
  const voice=reporterVoice(article);
  const lines={
    market:{
      nick:'That is a price move, not a personality test. Note it and keep going.',
      tilly:'The market moved. Nobody needs to fling themselves onto the fainting couch yet.',
      roycington:'Worth noting, certainly. Worth summoning the family solicitor over, absolutely not.',
      filch:'Useful market movement. It is not proof of football competence, innocence, or guilt.'
    },
    repeat1:{
      nick:'Good Sunday. Do it again before we call it anything bigger.',
      tilly:'Wonderful. One more of those and I may upgrade this from gossip to a story.',
      roycington:'Very good. Repetition would make it considerably less common.',
      filch:'Useful result. One repeat would turn the lead into actual evidence.'
    },
    repeat2:{
      nick:'Useful, loud, and still only one week.',
      tilly:'Enjoy the applause. The second performance is where the fun starts.',
      roycington:'Applause is permitted. Canonization remains terribly premature.',
      filch:'The number gets filed. The role still has to survive another Sunday.'
    },
    repeat3:{
      nick:'Take the points. Keep the parade permit unsigned.',
      tilly:'Take the points and save the victory lap for somebody with two receipts.',
      roycington:'A fine afternoon, though still an afternoon rather than a dynasty.',
      filch:'Good exhibit. Not yet a verdict.'
    }
  };
  return lines[key]?.[voice]||lines[key]?.nick||'';
}

function rewriteTopHeavyScoring(text,team,article){
  const {short,poss}=teamBits(team),who=String(article?.reporter?.name||'Nick Swindell');
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
  const {short}=teamBits(team),shortRe=escapeRe(short);
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

function deMeta(text,team,article){
  const {short}=teamBits(team);
  let out=String(text||'');
  out=out.replace(/Those moves matter to ([^.!?]+), but they do not grade what happened on Sunday\.?/gi,voiceLine(article,'market'));
  out=out.replace(/Both thoughts can fit in the same paragraph\.?/gi,'Both things are true. Neither needs a committee meeting.');
  out=out.replace(/That performance belongs in the same sentence as the first one\.\s*/gi,'');
  out=out.replace(/The useful question for ([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){0,3}) is whether the role repeats\.?/g,'The useful question is whether the role repeats.');
  out=out.replace(new RegExp(`For ${escapeRe(short)}, specific mistake, specific fix;`,'gi'),'Specific mistake, specific fix;');
  return out;
}

function fixArticleMetaAndGrammar(text,team,section,article){
  let out=removeInjectedFollowups(text,team);
  const {full,short}=teamBits(team),plural=/s$/i.test(short);
  out=deMeta(out,team,article);
  out=out.replace(/Two weeks is early, but standings are already old enough to annoy somebody; lose it and one loud Sunday starts looking like a cameo\.?/gi,'');
  out=out.replace(/I'm not asking for pessimism;\s*he is asking everyone/gi,"I'm not asking for pessimism; I'm asking everyone");
  out=out.replace(/I have no objection to a hero;\s*he objects when/gi,'I have no objection to a hero; I object when');
  if(plural){
    const subject=`(?:${escapeRe(full)}|${escapeRe(short)})`;
    const verbs={needs:'need',gets:'get',looks:'look',makes:'make',keeps:'keep',faces:'face',wants:'want',offers:'offer'};
    out=out.replace(new RegExp(`\\b(${subject})\\s+(?:(now|also)\\s+)?(needs|gets|looks|makes|keeps|faces|wants|offers)\\b`,'gi'),(_m,name,adv,verb)=>`${name} ${adv?adv+' ':''}${verbs[String(verb).toLowerCase()]||verb}`);
  }
  if(String(section?.kind||'').toLowerCase()==='sentiment'&&/^I note the fan base has already reached a verdict/i.test(out)){
    out=`${short} fans reached a verdict before the facts finished parking. Now they are shopping for evidence that agrees with them, which is cheaper than admitting the panic might have been premature.`;
  }
  if(String(section?.kind||'').toLowerCase()==='sentiment'&&full==='Pittsburgh Steelers'){
    out=out.replace(/researching waiver claims/gi,'redrawing the depth chart on a napkin as if the front office requested help');
  }
  out=restoreTradeAcquisitionContext(out,team);
  out=out.replace(/\s+([,.!?])/g,'$1').replace(/\.{2,}/g,'.').replace(/;\s*\./g,'.').trim();
  return out;
}

function removeRedundantTeamScore(paragraphs,team){
  const {full}=teamBits(team),scoreOnly=new RegExp(`^${escapeRe(full)} scored -?\\d+(?:\\.\\d+)? in Week 2\\.?$`,'i');
  return paragraphs.filter((p,i)=>!(scoreOnly.test(norm(p))&&i>0));
}

function mergeProblemStat(paragraphs){
  const out=[];
  for(let i=0;i<paragraphs.length;i++){
    const current=norm(paragraphs[i]),m=current.match(/^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}) scored (-?\d+(?:\.\d+)?) in Week 2:\s*(.+)$/);
    if(m&&paragraphs[i+1]){
      const name=m[1],next=norm(paragraphs[i+1]),nameRe=new RegExp(`^${escapeRe(name)}\\b[,:]?\\s*`);
      if(nameRe.test(next)){
        const follow=next.replace(nameRe,'').replace(/^has\s+/i,'has ').trim();
        out.push(`${name} gave the lineup ${m[2]} points on ${m[3]}. ${follow}`);
        i++;
        continue;
      }
    }
    out.push(current);
  }
  return out;
}

function rewriteContributorBoilerplate(paragraphs,article){
  let repeat=0;
  return paragraphs.map(text=>{
    let out=String(text||'');
    const patterns=[
      /([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}) gave us a good line; Week 3 decides whether it repeats\.?/,
      /([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}) has now earned one week of completely unreasonable celebration\.?/,
      /([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})'s production may enter the record without commissioning a trumpet procession\.?/,
      /([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})'s stat line matters only if the role explains it\.?/
    ];
    for(const re of patterns){
      if(!re.test(out))continue;
      repeat++;
      const line=voiceLine(article,`repeat${Math.min(3,repeat)}`);
      out=out.replace(re,line);
      break;
    }
    return out;
  });
}

function smoothRepeatedOpenings(paragraphs,team){
  const {full,short}=teamBits(team),counts=new Map();
  let previousLead='';
  const leadOf=s=>{
    const m=String(s||'').match(/^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})(?=\s|:|'s|'|’s|’)/);
    return m?m[1]:'';
  };
  const replaceLead=(sentence,lead,replacement)=>sentence.replace(new RegExp(`^${escapeRe(lead)}`),replacement);
  return paragraphs.map(raw=>{
    const sentences=String(raw||'').split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).filter(Boolean);
    for(let i=0;i<sentences.length;i++){
      let sentence=sentences[i],lead=leadOf(sentence);
      if(!lead)continue;
      const seen=counts.get(lead)||0,samePrevious=lead===previousLead;
      const isTeam=lead===full||lead===short;
      if(samePrevious){
        sentence=replaceLead(sentence,lead,isTeam?'They':'He');
      }else if(seen>=1&&isTeam&&lead===full){
        sentence=replaceLead(sentence,lead,short);
      }else if(seen>=2&&!isTeam){
        const last=lead.split(/\s+/).at(-1);
        if(last&&last!==lead)sentence=replaceLead(sentence,lead,last);
      }
      counts.set(lead,seen+1);
      previousLead=lead;
      sentences[i]=sentence;
    }
    return sentences.join(' ');
  });
}

function polishSection(section,team,article){
  let rows=(section?.paragraphs||[]).map(paragraph=>fixArticleMetaAndGrammar(rewriteTopHeavyScoring(paragraph,team,article),team,section,article)).filter(Boolean);
  rows=removeRedundantTeamScore(rows,team);
  rows=mergeProblemStat(rows);
  rows=rewriteContributorBoilerplate(rows,article);
  rows=smoothRepeatedOpenings(rows,team);
  return rows.map(norm).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169W(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=polishSection(section,team,article);
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169X=applyWeek2EditorialR16;
