import {applyWeek2EditorialR16 as applyR169X} from './inquirer-week2-editorial-r169x.mjs';

const norm=value=>String(value||'').replace(/\s+/g,' ').trim();
const esc=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function voice(article){
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'roycington';
  if(n==='Jefferson Filch')return'filch';
  return'nick';
}

function bits(team){
  const full=String(team?.team_name||'this team').trim();
  const short=full.split(/\s+/).filter(Boolean).at(-1)||full;
  return{full,short};
}

function resultContext(team,article){
  const rows=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).map(norm);
  let hit=null;
  for(const p of rows){
    let m=p.match(/^(?:No varnish: |The vulgar arithmetic: |The week's little comedy: |The record is annoyingly clear: )?(.+?) beat (.+?) (-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)(?: and moved to ([^.]+))?\.?$/i);
    if(m){hit={won:true,team:m[1],opp:m[2],pf:+m[3],pa:+m[4],record:m[5]||''};break}
    m=p.match(/^(?:No varnish: |The vulgar arithmetic: |The week's little comedy: |The record is annoyingly clear: )?(.+?) lost to (.+?) (-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)(?: and moved to ([^.]+))?\.?$/i);
    if(m){hit={won:false,team:m[1],opp:m[2],pf:+m[3],pa:+m[4],record:m[5]||''};break}
  }
  if(hit)hit.margin=Math.abs(hit.pf-hit.pa);
  return hit;
}

function resultJoke(ctx,article,short){
  if(!ctx)return'';
  const v=voice(article),m=ctx.margin.toFixed(1),opp=ctx.opp,pf=ctx.pf.toFixed(1),pa=ctx.pa.toFixed(1);
  if(ctx.won){
    if(ctx.margin>=35){
      if(v==='tilly')return `${short} did not beat ${opp}; they repossessed the furniture. ${pf}–${pa} is the kind of score that makes the loser close the app and pretend Sunday was for family.`;
      if(v==='roycington')return `${short} beat ${opp} by ${m}, which is less a victory than an eviction notice delivered in formalwear.`;
      if(v==='filch')return `${short} beat ${opp} by ${m}. At that margin there is no mystery to solve; one roster worked and the other left fingerprints everywhere.`;
      return `${short} beat ${opp} by ${m}. That is not “finding a way to win.” That is taking the other team's lunch money and checking the couch cushions on the way out.`;
    }
    if(ctx.margin<=5){
      if(v==='tilly')return `${short} escaped ${opp} by ${m}. Call it a win, but do not hang the portrait yet; this one still smells like somebody got away with something.`;
      if(v==='roycington')return `${short} survived ${opp} by ${m}, a margin narrow enough that etiquette requires thanking the opponent for every mistake.`;
      if(v==='filch')return `${short} beat ${opp} by ${m}. Close games are where one bad lineup choice stops being background noise and starts asking for a lawyer.`;
      return `${short} got past ${opp} by ${m}. Fine. Put the win in the standings and put the game film somewhere nobody can call it convincing.`;
    }
    return `${short} handled ${opp} by ${m}. Good win. Not historic, not accidental, and not complicated enough to need a documentary.`;
  }
  if(ctx.margin>=35){
    if(v==='tilly')return `${short} lost to ${opp} by ${m}. That is not a bad beat; that is a public breakup with witnesses.`;
    if(v==='roycington')return `${short} lost to ${opp} by ${m}, an afternoon so undignified the box score ought to arrive folded inside a condolence card.`;
    if(v==='filch')return `${short} lost to ${opp} by ${m}. Do not subpoena one starter for a margin like that; the whole roster was at the scene.`;
    return `${short} lost to ${opp} by ${m}. Stop looking for one villain. When the crater is that wide, everybody brought a shovel.`;
  }
  if(ctx.margin<=5){
    if(v==='tilly')return `${short} lost to ${opp} by ${m}, which is exactly the kind of loss that turns one bench decision into a week-long group chat trial.`;
    if(v==='roycington')return `${short} lost to ${opp} by ${m}. A narrow defeat is cruel because every tiny indignity suddenly demands its own hearing.`;
    if(v==='filch')return `${short} lost to ${opp} by ${m}. This is where one lineup mistake actually matters; the margin is small enough to put it under oath.`;
    return `${short} lost to ${opp} by ${m}. That is close enough to spend all week hating one decision, which is fantasy football's preferred form of cardio.`;
  }
  return `${short} lost to ${opp} by ${m}. Not a catastrophe, but nobody should be polishing participation trophies either.`;
}

function statPunch(text,article){
  const v=voice(article);
  const m=text.match(/^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})(?:'s Week 2 evidence against|:| put | contributed )\s*(.*)$/);
  if(!m)return text;
  const name=m[1],last=name.split(/\s+/).at(-1);
  const pts=(text.match(/(-?\d+(?:\.\d+)?) fantasy points/i)||[])[1];
  const opp=(text.match(/against ([A-Z][A-Za-z0-9 .'-]+?)(?:,|:)/)||[])[1];
  if(!pts||!opp)return text;
  if(v==='tilly')return `${last} dropped ${pts} on ${opp}. Keep the stat line; the better part is that ${opp} had to spend the afternoon watching it happen in public.`;
  if(v==='roycington')return `${last} put ${pts} on ${opp}. One does not need a trumpet procession, but refusing a small smirk would be unnecessarily austere.`;
  if(v==='filch')return `${last} scored ${pts} against ${opp}. That mattered because the matchup needed points, not a seminar on whether the production was “real.”`;
  return `${last} scored ${pts} against ${opp}. Good. The scoreboard accepts points immediately and does not ask for a three-week peer review.`;
}

function stripMeta(text){
  let out=String(text||'');
  const replacements=[
    [/\bevidence\b/gi,'proof'],[/\binvestigate\b/gi,'watch'],[/\binvestigation\b/gi,'look'],[/\bverdict\b/gi,'answer'],[/\bcase\b/gi,'argument'],[/\bwitness\b/gi,'showing'],[/\bsworn testimony\b/gi,'gospel'],[/\bclaim awaiting evidence\b/gi,'projection'],[/\blead, not a verdict\b/gi,'good week, not a religion'],[/\bgood exhibit\b/gi,'good game'],[/\bthe number gets filed\b/gi,'the number counts'],[/\buseful result\b/gi,'good game']
  ];
  for(const [re,to] of replacements)out=out.replace(re,to);
  out=out.replace(/\bone repeat would[^.!?]*[.!?]?/gi,'');
  out=out.replace(/\bWeek 3 (?:decides|gets to test|has to confirm|now has to confirm) whether[^.!?]*[.!?]?/gi,'');
  out=out.replace(/\bthe (?:role|opportunity) (?:still )?(?:has to|needs to) survive another Sunday[.!?]?/gi,'');
  out=out.replace(/\bthe useful question is whether the role repeats[.!?]?/gi,'');
  out=out.replace(/\bthe box score alone does not decide anything[.!?]?/gi,'');
  out=out.replace(/\brepeatable opportunity is the proof that matters[.!?]?/gi,'');
  return out.replace(/\s+([,.!?])/g,'$1').replace(/\.{2,}/g,'.').replace(/\s{2,}/g,' ').trim();
}

function sectionKind(section){
  const h=String(section?.heading||'').toLowerCase();
  if(/moved the game|made the noise|made the afternoon|names rivals/.test(h))return'players';
  if(/week 2 changed|second sunday|week 2:|week 2 was not subtle/.test(h))return'result';
  if(/problem|bad part|cannot follow/.test(h))return'problem';
  if(/management|decisions/.test(h))return'management';
  if(/market|price tag|roster price/.test(h))return'market';
  if(/week 3|next matchup/.test(h))return'next';
  return'other';
}

function rewriteResultSection(section,team,article,ctx){
  if(!ctx)return section.paragraphs||[];
  const {short}=bits(team),rows=(section.paragraphs||[]).map(norm).filter(Boolean),joke=resultJoke(ctx,article,short),out=[];
  let inserted=false;
  for(const row of rows){
    if(/\b(?:beat|lost to)\b.+\d+(?:\.\d+)?–-?\d/.test(row)){
      out.push(row);
      if(joke){out.push(joke);inserted=true}
      continue;
    }
    if(/cleared projection|missed projection/i.test(row)){
      const m=row.match(/(cleared|missed) projection by (\d+(?:\.\d+)?) points?/i);
      if(m){
        const n=Number(m[2]);
        out.push(m[1].toLowerCase()==='cleared'?`They beat projection by ${n}. Nice. More importantly, they beat ${ctx.opp}; projections do not get standings points.`:`They missed projection by ${n}. The model can be wrong and the loss can still be ugly; ${ctx.opp} gets the win either way.`);
        continue;
      }
    }
    if(/standings|sit \d of \d/i.test(row)){out.push(row.replace(/Two weeks is early[^.!?]*[.!?]?/i,'').trim());continue}
    if(/reason for optimism|reason to believe|reason to feel better/i.test(row))continue;
    out.push(stripMeta(row));
  }
  if(!inserted&&joke)out.splice(Math.min(1,out.length),0,joke);
  return out.filter(Boolean);
}

function rewritePlayerSection(section,team,article){
  const {short}=bits(team),rows=(section.paragraphs||[]).map(norm).filter(Boolean),out=[];
  for(const row of rows){
    if(/fantasy points/.test(row)&&(/against /.test(row)||/ put /.test(row)||/contributed /.test(row))){out.push(statPunch(row,article));continue}
    if(/supplied .*points, about \d+%/.test(row)){
      const m=row.match(/supplied ([\d.]+) points, about (\d+)%/i);
      if(m){
        const pct=Number(m[2]);
        if(pct>=70)out.push(`${short} got about ${pct}% of its scoring from three players. That is less “balanced attack” and more “three adults carrying a refrigerator while everyone else holds the door.”`);
        else if(pct>=60)out.push(`${short}'s top three produced about ${pct}% of the total. Strong enough to win games, concentrated enough to make one quiet Sunday immediately annoying.`);
        else out.push(`${short} spread the scoring around enough that nobody had to perform CPR on the lineup by himself.`);
        continue;
      }
    }
    const cleaned=stripMeta(row);
    if(cleaned&&!/\b(?:ceiling|benchmark|rate is the benchmark|role repeats|old expectation)\b/i.test(cleaned))out.push(cleaned);
  }
  return out;
}

function rewriteManagement(section,team,ctx){
  const {short}=bits(team),rows=(section.paragraphs||[]).map(norm).filter(Boolean),out=[];
  for(const row of rows){
    const m=row.match(/(?:Trade acquisition )?(.+?) outscored (.+?) by (\d+(?:\.\d+)?) from a compatible bench spot/i);
    if(m){
      const gap=Number(m[3]);
      if(ctx&&!ctx.won&&gap>=ctx.margin)out.push(`${m[1]} outscored ${m[2]} by ${gap} from a compatible bench spot. ${short} lost by ${ctx.margin.toFixed(1)}. Congratulations: we have found the exact rake they stepped on.`);
      else if(ctx&&ctx.won)out.push(`${m[1]} outscored ${m[2]} by ${gap} from a compatible bench spot. The win means ${short} gets to laugh about it this week instead of explaining it under fluorescent lighting.`);
      else out.push(`${m[1]} outscored ${m[2]} by ${gap} from a compatible bench spot. That is a real lineup mistake, not a horoscope.`);
      continue;
    }
    if(/no compatible bench swap/i.test(row)){out.push(`${short} did not have an obvious bench swap that flips the story. Sometimes the lineup was fine and the players simply chose violence against their own manager.`);continue}
    const cleaned=stripMeta(row);
    if(cleaned&&!/rest of the roster does not belong in the same criticism/i.test(cleaned))out.push(cleaned);
  }
  return out;
}

function rewriteProblem(section,team){
  const {short}=bits(team),rows=(section.paragraphs||[]).map(norm).filter(Boolean),out=[];
  for(const row of rows){
    const m=row.match(/^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}) gave the lineup (-?\d+(?:\.\d+)?) points on (.+?)\.? (.*)$/);
    if(m){out.push(`${m[1]} gave ${short} ${m[2]} points on ${m[3]}. That is the kind of line that makes a manager stare at the app like refreshing it might add a touchdown.`);continue}
    out.push(stripMeta(row));
  }
  return out.filter(Boolean);
}

function rewriteNext(section,team){
  const {short}=bits(team),rows=(section.paragraphs||[]).map(norm).filter(Boolean),out=[];
  for(const row of rows){
    if(/playoff estimate/i.test(row)){
      const pct=(row.match(/(\d+(?:\.\d+)?)%/)||[])[1];
      if(pct)out.push(`${short}'s playoff estimate is ${pct}%. Put it on the refrigerator if you want; just remember the refrigerator does not set lineups.`);
      continue;
    }
    if(/projection/i.test(row)&&/Week 3/i.test(row)){
      out.push(`${row.split(/\.\s*/)[0]}. Fine. If the projection is right, act like it. If it is wrong, at least make it wrong in an entertaining direction.`);
      continue;
    }
    out.push(stripMeta(row));
  }
  return out.filter(Boolean);
}

function rewriteArticle(team){
  const article=team?.inquirer_article;
  if(!article)return;
  const ctx=resultContext(team,article);
  for(const section of article.sections||[]){
    const kind=sectionKind(section);
    if(kind==='result')section.paragraphs=rewriteResultSection(section,team,article,ctx);
    else if(kind==='players')section.paragraphs=rewritePlayerSection(section,team,article);
    else if(kind==='management')section.paragraphs=rewriteManagement(section,team,ctx);
    else if(kind==='problem')section.paragraphs=rewriteProblem(section,team);
    else if(kind==='next')section.paragraphs=rewriteNext(section,team);
    else section.paragraphs=(section.paragraphs||[]).map(stripMeta).filter(Boolean);
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169X(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])rewriteArticle(team);
  return out;
}

export const applyWeek2EditorialR169Y=applyWeek2EditorialR16;
