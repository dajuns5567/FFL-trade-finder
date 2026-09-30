from pathlib import Path

gen_path=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
test_path=Path('scripts/inquirer-week2-voice-r15-smoke.mjs')
workflow_path=Path('.github/workflows/week2-editorial-r17-one-shot.yml')
self_path=Path('scripts/week2-editorial-r17-patch.py')

src=gen_path.read_text()

def replace_once(text, old, new, label):
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

src=replace_once(src,'export const WEEK2_EDITORIAL_REVISION=16;','export const WEEK2_EDITORIAL_REVISION=17;','revision')
src=src.replace("'week2-r16'","'week2-r17'")

insert=r'''
function sharpenTeamParagraph(t,id,kind,p,index){
 let x=String(p||'').trim();
 if(!x||id==='mack-hollis')return x;
 const tm=String(t?.team_name||'This team');
 x=x
  .replace(/The next game should tell us which Week 2 traits are structural and which were matchup noise\./gi,'Week 3 gives '+tm+' one job: prove Week 2 was football and not a one-Sunday costume; if the same weakness shows up again, stop calling it noise.')
  .replace(/Strong production; now the role has to sustain it\./gi,'Good; '+tm+' can applaud the production, but one useful Sunday does not come with diplomatic immunity.')
  .replace(/For ([^.!?]+), the role increase supports the idea that the production has structural backing\./gi,'For $1, the bigger role matters; if the points disappear with that workload, '+tm+' can retire the excuses for a week.')
  .replace(/Strong production deserves to be stated plainly\./gi,'Good production deserves credit; '+tm+' still has to make it happen again before anybody starts acting smug.')
  .replace(/Now the role has to sustain it\./gi,'Now '+tm+' needs it again; one decent Sunday is a contribution, not a lifetime appointment.')
  .replace(/Supporters have a measurable lineup decision to question, which is fair, and Week 3 will provide an equally measurable response\./gi,'Supporters saw the '+tm+' lineup mistake with their own eyes; make it again and nobody needs advanced math to boo it.')
  .replace(/The useful standard for ([^.!?]+) is simple: repeat the strengths and materially reduce the Week 2 failure points\./gi,'The assignment for $1 is simple: keep what worked and stop repeating the stupid parts; nobody gets extra credit for making that sound complicated.')
  .replace(/\bmaterially changed\b/gi,'actually changed')
  .replace(/\bmaterially better\b/gi,'actually better')
  .replace(/\buseful contribution\b/gi,'good contribution')
  .replace(/\buseful standard\b/gi,'simple standard')
  .replace(/\buseful conclusion\b/gi,'obvious conclusion')
  .replace(/\bspecific expectations\b/gi,'expectations')
  .replace(/\bstructural backing\b/gi,'something real behind it')
  .replace(/\bstructural\b/gi,'real')
  .replace(/\bmatchup noise\b/gi,'one-Sunday nonsense')
  .replace(/\bmeasurable\b/gi,'obvious');
 const banks={
  'walter-mercer':[
   'For '+tm+', good football gets credit and bad football gets named; I am too old to pretend the stupid parts did not happen.',
   tm+' can enjoy the good part, and '+tm+' can still boo the stupid part.',
   'If '+tm+' repeats that mistake, nobody gets to call '+tm+' unlucky with a straight face.',
   'I have watched enough '+tm+' Sundays to know when “small sample” is becoming an alibi, and I am not buying another week of it.',
   tm+' earned the result, not immunity from criticism; those are different privileges for '+tm+'.',
   'That is the sort of thing '+tm+' can survive once; twice would be '+tm+' volunteering for ridicule.',
   'I am old-fashioned about this: '+tm+' should reward the players producing points and stop donating chances to the ones producing excuses.',
   tm+' does not need a sermon here; '+tm+' needs the bad football to stop before I run out of polite synonyms for bad.'
  ],
  'tess-delaney':[
   'For '+tm+', competence is attractive and repeating avoidable nonsense is not; I will praise one and sneer at the other without apology.',
   tm+' may keep the points, but the ugly decision beside them still deserves tomatoes from '+tm+' supporters.',
   'There is something almost elegant about '+tm+' doing the hard part and then tripping over the easy one—almost.',
   'If '+tm+' insists on repeating that mistake, '+tm+' should at least have the decency to make it funny.',
   'I adore excess when '+tm+' earns it and despise '+tm+' waste with equal commitment.',
   'A little swagger suits '+tm+'; so would fewer self-inflicted problems from '+tm+'.',
   tm+' has earned applause, not absolution, and I refuse to confuse the two.',
   'The football was good enough for '+tm+' champagne in spots and ugly enough for '+tm+' heckling in others.'
  ],
  'nora-voss':[
   'For '+tm+', the mistake is too obvious to hide behind “small sample”; if '+tm+' does it again, call it a habit instead of bad luck.',
   tm+' can keep the win, but '+tm+' does not get a pardon for the bad decision just because the scoreboard was friendly.',
   'If '+tm+' repeats this lineup mistake, '+tm+' management is not unlucky; it is stubborn.',
   'Good, now do it again: '+tm+' does not get lifetime credit for one competent Sunday.',
   'The '+tm+' weak spot is not mysterious; '+tm+' either fixes it or invites rivals to keep laughing.',
   tm+' has enough information now, and repeating the same mistake would be a stupid choice by '+tm+'.',
   'One good number is welcome, but '+tm+' still owes us football that survives contact with another Sunday.',
   'I am done treating '+tm+' lineup problems like philosophical questions; '+tm+' should start the better option and spare everyone the ceremony.'
  ]
 };
 const rows=banks[id];
 if(!rows)return x;
 const eligible=/^(?:lede|players|management|hot-seat|cool-throne|sentiment|outlook|value)$/.test(kind);
 const mod=id==='tess-delaney'?3:2;
 const seed=key(t)+'|r17-bite|'+id+'|'+kind+'|'+index;
 if(eligible&&hash(seed)%mod===0){
  const bite=pick(rows,seed);
  if(bite&&!x.includes(bite))x=(x+' '+bite).trim();
 }
 return x;
}

function sharpenRecapParagraph(id,p,index){
 let x=String(p||'').trim();
 if(!x)return'';
 x=x
  .replace(/That is the sort of blowout where the losing side starts checking whether the scoring app accidentally counted two Sundays\./gi,'That is the sort of blowout where the losing side starts wondering whether the scoreboard has developed a personal grudge.')
  .replace(/The moves worth keeping on the back page:/gi,'The moves worth remembering:')
  .replace(/The back page accepts both forms of content\./gi,'Sunday has room for both.')
  .replace(/saved the receipts/gi,'remembered exactly what happened')
  .replace(/next piece of evidence/gi,'next ugly answer')
  .replace(/headline factories/gi,'ways to get mocked')
  .replace(/keeps the celebratory typeface/gi,'keeps strutting')
  .replace(/correction printed twice as large/gi,'correction twice as loud')
  .replace(/\bheadlines?\b/gi,'jokes')
  .replace(/\bback page\b/gi,'Sunday')
  .replace(/\bcopy desk\b/gi,'league')
  .replace(/\bnewsroom\b/gi,'league')
  .replace(/\bpublication\b/gi,'league')
  .replace(/\btypeface\b/gi,'swagger')
  .replace(/\bevidence\b/gi,'football')
  .replace(/\bverdict\b/gi,'answer')
  .replace(/\bexhibits?\b/gi,'examples')
  .replace(/\bcase files?\b/gi,'problems')
  .replace(/\bfolders?\b/gi,'problems')
  .replace(/\breceipts?\b/gi,'memories')
  .replace(/\bscreenshots?\b/gi,'jokes')
  .replace(/\bgroup chats?\b/gi,'rivals')
  .replace(/\brival chats?\b/gi,'rivals')
  .replace(/\brival threads?\b/gi,'rivals')
  .replace(/\bmemes?\b/gi,'mockery')
  .replace(/\bapps?\b/gi,'scoreboard')
  .replace(/\buseful conclusion\b/gi,'obvious conclusion')
  .replace(/specific expectations to confirm or break/gi,'expectations to justify or embarrass')
  .replace(/one concrete decision with measurable cost/gi,'one bad decision with a price everybody could see');
 if(id==='mack-hollis')return x;
 const banks={
  'walter-mercer':[
   'Two Sundays are enough to stop handing out free excuses; bad football becomes a habit when everybody keeps calling it temporary.',
   'I have seen September optimism before, and the teams worth trusting are the ones that stop repeating the dumb parts.',
   'Enjoy the wins, complain about the mistakes and spare me the idea that caring less would be more sophisticated.'
  ],
  'tess-delaney':[
   'The league served excellent football beside several decisions that deserved tomatoes, and I see no reason to be diplomatic about either.',
   'Some teams earned champagne, others earned heckling, and a few ambitious clubs managed both in the same afternoon.',
   'September has already produced enough beauty and stupidity to justify being emotionally unreasonable about all of it.'
  ],
  'nora-voss':[
   'By Week 2, repeating the same lineup mistake is no longer mysterious; it is management volunteering to be mocked.',
   'The league has enough information to distinguish bad luck from stubbornness, and several managers should be nervous about the distinction.',
   'One ugly Sunday can happen; repeating the same ugly decision is how a mistake starts introducing itself as policy.'
  ]
 };
 const rows=banks[id];
 if(rows&&hash('recap-r17|'+id+'|'+index)%2===0){
  const bite=pick(rows,'recap-r17|'+id+'|'+index);
  if(bite&&!x.includes(bite))x=(x+' '+bite).trim();
 }
 return x;
}
'''

src=replace_once(src,'function reviseTeam(t){',insert+'\nfunction reviseTeam(t){','insert sharpeners')
src=replace_once(src,"  else paragraphs=buildGeneric(sec);\n  return{...sec,paragraphs};","  else paragraphs=buildGeneric(sec);\n  paragraphs=(paragraphs||[]).map((p,j)=>sharpenTeamParagraph(t,id,kind,p,j)).filter(Boolean);\n  return{...sec,paragraphs};",'team sharpening hook')
src=replace_once(src,"  const paragraphs=uniq([...core,developedDepth,recapReaction(id,seed,0),recapReaction(id,seed,1)]).slice(0,10);","  const paragraphs=uniq([...core,developedDepth,recapReaction(id,seed,0),recapReaction(id,seed,1)]).map((p,j)=>sharpenRecapParagraph(id,p,j)).filter(Boolean).slice(0,10);",'recap sharpening hook')
gen_path.write_text(src)

test=test_path.read_text()
test=test.replace('Number(WEEK2_EDITORIAL_REVISION),16','Number(WEEK2_EDITORIAL_REVISION),17')
test=test.replace('Number(revised?.editorial_revision),16','Number(revised?.editorial_revision),17')
test=test.replace("revised?.voice_revision,'week2-r16'","revised?.voice_revision,'week2-r17'")
test=test.replace("Number(t?.inquirer_article?.editorial_revision),16","Number(t?.inquirer_article?.editorial_revision),17")
test=test.replace("t?.inquirer_article?.voice_revision,'week2-r16'","t?.inquirer_article?.voice_revision,'week2-r17'")
test=test.replace('Number(overview.editorial_revision),16','Number(overview.editorial_revision),17')
test=test.replace("overview.voice_revision,'week2-r16'","overview.voice_revision,'week2-r17'")

anchor="assert(!/trade is attached to a roster that is still actively chasing something/i.test(overviewText),'Weekly recap still repeats active-roster trade scaffold');"
extra="""
assert(!/\\b(?:headline|back page|copy desk|newsroom|publication|typeface|evidence|verdict|exhibits?|case files?|folders?|receipts?|screenshots?|group chats?|rival chats?|rival threads?|memes?|apps?)\\b/i.test(overviewText),'Weekly recap still leans on newsroom/file/tech crutches');
const jeffersonText=revisedTeams.filter(t=>String(t?.inquirer_article?.reporter?.id||'')==='nora-voss').map(articleText).join(' ');
assert(!/\\b(?:strong production; now the role has to sustain it|the next game should tell us which Week 2 traits are structural and which were matchup noise|supporters have a measurable lineup decision to question|the useful standard .* materially reduce the Week 2 failure points)\\b/i.test(jeffersonText),'Jefferson still contains the clinical prose called out by the Week 2 audit');
"""
if anchor not in test:
    raise SystemExit('smoke-test anchor not found')
test=test.replace(anchor,anchor+extra,1)
test_path.write_text(test)

workflow_path.unlink(missing_ok=True)
self_path.unlink(missing_ok=True)
