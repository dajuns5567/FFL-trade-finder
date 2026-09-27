import fs from 'node:fs';
import week1 from '../netlify/functions/inquirer-week1-2026-preload.mjs';
import week2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';

const out=process.env.OUT||process.argv[2]||'/tmp/week2-cross-reporter-polished.json';
const d=JSON.parse(JSON.stringify(week2));
const previous=new Map((week1?.teams||[]).map(t=>[String(t.roster_id),t]));

function one(v){return Number(v||0).toFixed(1)}
function hash(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function bridge(t,r,prev){
  const team=String(t?.team_name||'Team'),rid=String(r?.id||'walter-mercer');
  if(!prev){
    const missing={
      'walter-mercer':'There is no complete opening-week snapshot for '+team+', so Sunday gets evaluated on the result in front of us instead of a comparison we do not have.',
      'tess-delaney':'The opener is incomplete for '+team+', which removes the temptation to dress up a comparison that does not exist. This Sunday can answer for itself.',
      'mack-hollis':team+' has no complete Week 1 tape in the packet, so the latest Sunday gets the whole spotlight. No fake trend line required.',
      'nora-voss':'Rivals do not get a clean Week 1 comparison for '+team+'. Fine. The current result supplied enough material without borrowing any.'
    };
    return missing[rid]||missing['walter-mercer'];
  }
  const prevWon=Number(prev.points)>Number(prev.opponent_points),score=one(prev.points)+'–'+one(prev.opponent_points),
    foe=String(prev.opponent_name||'last week’s opponent'),outcome=prevWon?'beat':'lost to',
    v=hash(team+'|previous-week-bridge|'+rid)%4;
  const banks={
    'walter-mercer':[
      'A week earlier, '+team+' '+outcome+' '+foe+' '+score+'. That opener belongs in the comparison, but the current Sunday gets its own evaluation.',
      'Week 1 put a '+score+' '+(prevWon?'win over ':'loss to ')+foe+' on '+team+'’s ledger. Week 2 adds a second result without turning either one into a permanent identity.',
      team+' came out of Week 1 with a '+score+' '+(prevWon?'win over ':'loss to ')+foe+'. The next Sunday changes the season sample; it does not simply photocopy the first conclusion.',
      'The opening entry for '+team+' was '+score+' against '+foe+', a '+(prevWon?'win':'loss')+'. Week 2 now gives that result context instead of permission to speak for the whole season.'
    ],
    'tess-delaney':[
      team+' arrived from Week 1 carrying a '+score+' '+(prevWon?'win over ':'loss to ')+foe+'. The second Sunday changes the conversation without requiring us to pretend the opener vanished.',
      'The opener gave '+team+' a '+score+' '+(prevWon?'win over ':'loss to ')+foe+'. Week 2 is the next chapter, not a decorative reprint of the first one.',
      'One week earlier, '+team+' '+outcome+' '+foe+' '+score+'. That result still belongs in the story, but Sunday has earned the right to change the tone.',
      team+' opened at '+score+' against '+foe+' and left with '+(prevWon?'a win':'a loss')+'. The current result gets compared with that beginning without being forced to imitate it.'
    ],
    'mack-hollis':[
      'Week 1 had '+team+' at '+score+' against '+foe+', good for '+(prevWon?'a win':'a loss')+'. Week 2 just gave the season a new headline instead of recycling the old one.',
      team+' left the opener with a '+score+' '+(prevWon?'win over ':'loss to ')+foe+'. Another Sunday means another piece of evidence and, thankfully, a different argument.',
      'The first scoreboard for '+team+' read '+score+' against '+foe+'. That '+(prevWon?'win':'loss')+' was loud then; Week 2 gets its own volume knob.',
      'A '+score+' '+(prevWon?'win over ':'loss to ')+foe+' started '+team+'’s season. The latest Sunday does not need to borrow the opener’s punch line.'
    ],
    'nora-voss':[
      'Rivals entered Week 2 with '+team+'’s '+score+' '+(prevWon?'win over ':'loss to ')+foe+' already in the chat. Sunday gave them new material, for better or worse.',
      team+' opened with a '+score+' '+(prevWon?'win over ':'loss to ')+foe+'. That screenshot stays in the archive; Week 2 gets judged on the fresh one.',
      'The first result on '+team+' was '+score+' against '+foe+', a '+(prevWon?'win':'loss')+'. Rivals can keep it, but they do not get to pretend the second Sunday said the exact same thing.',
      'Week 1 handed the rival chat a '+score+' '+(prevWon?'win over ':'loss to ')+foe+' for '+team+'. Week 2 changed the material instead of asking everyone to resend it.'
    ]
  };
  const bank=banks[rid]||banks['walter-mercer'];
  return bank[v];
}

let bridgeChanges=0,roadChanges=0;
for(const t of d.teams||[]){
  const a=t?.inquirer_article;if(!a)continue;
  const rid=String(a?.reporter?.id||''),prev=previous.get(String(t.roster_id))||null;
  for(const section of a.sections||[]){
    section.paragraphs=(section.paragraphs||[]).map(p=>{
      let s=String(p||'');
      if(section.kind==='lede'&&/^In Week 1,/.test(s)&&/; after Week 2, that leaves /.test(s)){
        s=bridge(t,a.reporter||{},prev);bridgeChanges++;
      }
      if(rid==='tess-delaney'&&/shows up carrying everybody’s panic/.test(s)){
        s=s.replace(/Win it and the ([^.;]+?) get to attack; lose it and ([^.;]+?) shows up carrying everybody’s panic\./g,
          'Win it and the $1 can treat the next game as opportunity; lose and $2 becomes the matchup that turns every unresolved flaw into a louder question.');
        roadChanges++;
      }
      return s;
    });
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
}
if(bridgeChanges!==32)throw new Error('Expected 32 shared Week 2 history bridges; changed '+bridgeChanges);
if(roadChanges!==2)throw new Error('Expected 2 Roycington/Tilly panic overlaps; changed '+roadChanges);
const copy=(d.teams||[]).flatMap(t=>t?.inquirer_article?.paragraphs||[]).join(' ');
if(/two straight losses and a repair job that can no longer wait|two straight wins and a standard worth defending|a response instead of a spiral|a split start and an unanswered question/i.test(copy))throw new Error('Shared record-state bridge survived patch');
if(/Bartholomew Roycington III/.test(copy)&&/shows up carrying everybody’s panic/.test((d.teams||[]).filter(t=>t?.inquirer_article?.reporter?.id==='tess-delaney').flatMap(t=>t.inquirer_article.paragraphs||[]).join(' ')))throw new Error('Roycington/Tilly panic phrase still crosses into Roycington copy');
fs.writeFileSync(out,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({ok:true,out,bridgeChanges,roadChanges,week:d.week,season:d.season,teams:d.teams?.length||0},null,2));
