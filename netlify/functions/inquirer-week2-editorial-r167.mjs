import {applyWeek2EditorialR16 as applyR166} from './inquirer-week2-editorial-r166.mjs';

const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const teamName=t=>String(t?.team_name||t?.name||'this team');
const shortRef=t=>teamName(t).trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const reporter=a=>String(a?.reporter?.name||'Nick Swindell');
const record=t=>{const r=t?.league_context?.record||{};return`${Number(r.wins)||0}-${Number(r.losses)||0}`;};
const score=t=>Number.isFinite(Number(t?.points))?Number(t.points):null;

const OLD_ADDED=/motivational poster|supplies enough chaos|Revolutionary concept|butter knife|philosophical retreat|making a correct lineup decision|management question is narrow|management scandal|standard is simple: criticize|turn this into a seminar|controllable part|Bad luck is annoying|unreasonable messages|missing-person report|fan base has enough evidence|victory lap indoors|maintain standards without becoming uncivilized|public mood is neither|useful pressure|scoring problem to stop|crowd is not confused|fans can be loud for a week|fans have every right to be irritated|parade or a crisis meeting/i;

function actionableManagement(s){
  const text=(s?.paragraphs||[]).join(' ');
  if(/no compatible bench swap|not a management mistake|belongs to the players|player performance|role does not actually show|no obvious management failure/i.test(text))return false;
  return /bench|start\/sit|lineup mistake|obvious (?:swap|choice|alternative|fix)|better option|outscored .* from the bench|should have started/i.test(text);
}

const MGMT={
  'Nick Swindell':{
    yes:[
      r=>`${r} had a fix sitting in plain sight. Use it next week; fantasy football is difficult enough without volunteering points.`,
      r=>`This one reaches management. ${r} had a better answer available and chose the scenic route to the same problem.`,
      r=>`There is an actionable mistake here, which is refreshing in the worst way. ${r} can correct it before Week 3 instead of blaming Sunday weather systems and astrology.`,
      r=>`${r} does not need a roster summit. It needs the better lineup choice made on time, preferably before the points start counting.`,
      r=>`The useful criticism is simple: ${r} left a better option unused. Fix that and save the philosophical debate for a loss nobody could prevent.`,
      r=>`Management gets this one on the invoice. ${r} had a cleaner choice and paid real points for ignoring it.`,
      r=>`A bad player week is one thing; choosing around an obvious answer is another. ${r} managed to purchase the second problem at full price.`,
      r=>`${r} can solve this without a trade, a séance, or a manifesto. Put the better option in the lineup next time.`
    ],
    no:[
      r=>`There is no useful management scandal here. ${r} mostly got the lineup answer right and the players supplied the disappointment themselves.`,
      r=>`I am not charging management for a crime the roster committed. ${r} did not have an obvious bench answer hiding in the evidence.`,
      r=>`The easy reaction would be to blame the manager. The accurate one is less satisfying: ${r} needed better player production, not clairvoyance.`,
      r=>`${r} did not leave a clean fix on the bench. Sometimes the starter simply plays badly, which is rude but not managerial malpractice.`,
      r=>`No dramatic lineup indictment this week. ${r} made a defensible choice and still got a bad result, a traditional fantasy football nuisance.`,
      r=>`Management can keep the helmet on the hook for this one. ${r} had no obvious alternative that turns the result into a solved problem.`,
      r=>`If there is a management lesson here, it is not to invent one. ${r} needed the chosen players to perform better; the bench offered no magic door.`,
      r=>`The manager does not need a public flogging because hindsight found a louder number. ${r} had no clearly superior choice before kickoff.`
    ]
  },
  'Tilly Fleecer':{
    yes:[
      r=>`${r} had the better lineup answer available and still stepped around it. Adorable. Please stop doing that while the games count.`,
      r=>`Management actually earned the side-eye here. ${r} left useful points unused and then acted surprised when arithmetic remained undefeated.`,
      r=>`This is the fun kind of mistake because it is fixable. ${r} can start the better option next week and avoid turning Sunday into performance art.`,
      r=>`${r} had an obvious correction and chose suspense instead. I appreciate theater; I prefer fantasy points.`,
      r=>`The bench offered an answer. ${r} declined it. Wonderful plot twist, terrible lineup management.`,
      r=>`Nobody needs a twelve-step plan. ${r} just needs to stop making the harder choice when the easier one scores more.`,
      r=>`I found the management mistake without binoculars. ${r} can fix it before Week 3 and spare everyone the sequel.`,
      r=>`${r} donated points through a lineup decision. Very charitable. The opponent sends its regards.`
    ],
    no:[
      r=>`I would love to yell at management, but the evidence is being inconvenient. ${r} had no obvious better answer; the players simply produced a bad Sunday.`,
      r=>`No, I am not blaming the manager because hindsight found a bench player with a pulse. ${r} made a reasonable choice and got an unreasonable result.`,
      r=>`${r} does not need a lineup confession. It needs the established starters to stop making perfectly normal decisions look suspicious.`,
      r=>`The manager is not the villain of this episode. ${r} chose sensibly enough; the production was the embarrassing part.`,
      r=>`There was no magic bench swap waiting to save ${r}. Sometimes the correct process still sends you home with a bag of nonsense.`,
      r=>`I checked for an obvious managerial disaster because those are fun. ${r} did not provide one, so the players get to own the mess.`,
      r=>`${r} had no clean alternative before kickoff. Blaming management now would just be hindsight wearing a tiny fake mustache.`,
      r=>`Save the manager outrage for a week that earns it. ${r} mostly needed better football from the people already in the lineup.`
    ]
  },
  'Bartholomew Roycington III':{
    yes:[
      r=>`${r} had a superior lineup option within reach and declined it. One may call that a choice; I prefer an avoidable expense.`,
      r=>`Management has earned a modest summons. ${r} left the better answer unused, which is not quite sabotage but has dreadful manners.`,
      r=>`The correction is mercifully uncomplicated: ${r} should use the better option next week and retire this particular bit of improvisation.`,
      r=>`${r} possessed the sensible answer and selected the decorative one. I admire presentation, but points remain the preferred accessory.`,
      r=>`There is no need for a committee. ${r} had a better lineup choice, ignored it, and received the appropriately impolite consequence.`,
      r=>`Management may keep the silverware but should return the decision. ${r} paid for an avoidable lineup mistake.`,
      r=>`${r} made Sunday more difficult than necessary by declining the cleaner option. Complexity is not automatically sophistication.`,
      r=>`A better answer was available to ${r}. Next week, perhaps we can enjoy the radical elegance of simply using it.`
    ],
    no:[
      r=>`There is no respectable management indictment here. ${r} made a defensible choice and the player returned an indecent result.`,
      r=>`I decline to manufacture a managerial scandal for ${r}. The bench did not contain a clearly superior answer before kickoff.`,
      r=>`${r} does not require a front-office inquest. It requires better production from the players already entrusted with the work.`,
      r=>`The temptation to blame management is understandable and, regrettably, unsupported. ${r} had no obvious correction waiting in reserve.`,
      r=>`No lineup malpractice charge today. ${r} chose reasonably; Sunday responded without the courtesy of rewarding reason.`,
      r=>`Management escapes criticism not through charm but through lack of an actionable alternative. ${r} simply needed the starter to perform.`,
      r=>`One must resist dressing hindsight as strategy. ${r} had no clear bench solution when the decision actually mattered.`,
      r=>`The unpleasant truth is ordinary: ${r} made a sensible enough choice and received poor production in return. No monocle required.`
    ]
  },
  'Jefferson Filch':{
    yes:[
      r=>`${r} had an actionable alternative and ignored it. That makes this a management problem, not a vague complaint about variance.`,
      r=>`The decision trail is clear enough: ${r} had a better lineup option available. That is where the criticism belongs.`,
      r=>`${r} can correct this without guessing about motives or inventing a crisis. Use the better option next week and close the file.`,
      r=>`There is a specific management mistake here. ${r} left the stronger answer unused, and the point loss is measurable.`,
      r=>`This one does not require speculation. ${r} had a better choice on the bench and paid for not using it.`,
      r=>`Management deserves scrutiny because the alternative existed before kickoff. ${r} did not need hindsight to see it.`,
      r=>`The useful finding is narrow: ${r} had a superior lineup answer and missed it. Fix that before searching for larger theories.`,
      r=>`${r} created avoidable exposure with the lineup choice. That is actionable, which makes it more important than the usual postgame noise.`
    ],
    no:[
      r=>`There is no evidence of an obvious management error here. ${r} made a defensible choice; the selected player failed to justify it.`,
      r=>`Do not turn a bad player result into a management case. ${r} had no clearly superior alternative before kickoff.`,
      r=>`The criticism belongs with production, not process. ${r} did not leave an obvious solution unused.`,
      r=>`${r} had no clean bench answer that changes the pregame decision. The player result is the problem worth tracking.`,
      r=>`The record does not support a management indictment. ${r} chose reasonably and received poor production anyway.`,
      r=>`There is nothing actionable in blaming the manager here. ${r} needed the starter to perform closer to expectation.`,
      r=>`Hindsight can produce a suspect; it cannot produce a better pregame option. ${r} had no obvious swap that fixes this.`,
      r=>`Management is not the finding. ${r} had a defensible lineup and the player failed to deliver; keep the criticism attached to the evidence.`
    ]
  }
};

const SENT={
  'Nick Swindell':[
    (r,p)=>`${r} fans can enjoy the result, but ${p} points does not buy immunity from Week 3 questions.`,
    r=>`${r} supporters have seen enough to care and not enough to relax. That is usually where the yelling starts.`,
    r=>`The mood around ${r} should match the evidence: pleased with what worked, irritated by what did not, and suspicious of anyone declaring the case closed.`,
    r=>`${r} fans do not need optimism sold back to them at retail. They need another Sunday that makes the current mood look earned.`,
    r=>`The crowd around ${r} has permission to be emotional; the standings still do not have enough weeks on them to be persuasive.`,
    r=>`${r} supporters can raise expectations now. That is the reward and the threat packed into the same Week 2 box.`,
    r=>`Nobody following ${r} is obligated to be calm. They are only obligated to remember that two games is a very small sample with excellent marketing.`,
    r=>`${r} fans have a legitimate reaction this week. Week 3 gets to decide whether it becomes confidence or merely a story they enjoyed briefly.`
  ],
  'Tilly Fleecer':[
    r=>`${r} fans may celebrate. I am granting a temporary permit for reckless confidence, revocable at kickoff next Sunday.`,
    r=>`The ${r} crowd has feelings now, which is dangerous because fantasy football loves nothing more than noticing that.`,
    r=>`${r} supporters can enjoy this without behaving normally. I would never ask something so unreasonable of sports fans.`,
    r=>`The mood around ${r} has upgraded from concern to emotionally expensive curiosity. Congratulations, I suppose.`,
    r=>`${r} fans have earned one week of louder opinions. Please use them irresponsibly but keep receipts for Week 3.`,
    r=>`I understand why ${r} supporters are excited or furious. Restraint is available as an option; nobody has ever selected it.`,
    r=>`The ${r} crowd does not need calming down. It needs the next result before somebody starts planning either a parade or a funeral.`,
    r=>`${r} fans are allowed to overreact a little. Two weeks is not evidence of destiny, but it is plenty of evidence for shouting.`
  ],
  'Bartholomew Roycington III':[
    r=>`${r} supporters may enjoy the moment, preferably without commissioning commemorative china after two weeks.`,
    r=>`The public mood around ${r} is justified, if perhaps slightly overdressed. Week 3 will tell us whether the tailoring holds.`,
    r=>`${r} fans are entitled to enthusiasm or complaint as appropriate. I merely ask that nobody confuse volume with proof.`,
    r=>`One understands the emotion around ${r}. One also keeps the champagne somewhere inconvenient until a third game offers testimony.`,
    r=>`${r} supporters have permission to feel strongly. The season has not yet granted permission to feel certain.`,
    r=>`The ${r} crowd may bask or brood according to taste. Both activities remain cheaper than pretending two games settled anything.`,
    r=>`${r} has given its public something worth discussing, which is preferable to indifference and only slightly less exhausting.`,
    r=>`The emotion around ${r} is real. Whether it is prophetic is a matter I will leave to Sunday, which has dreadful manners but useful answers.`
  ],
  'Jefferson Filch':[
    r=>`${r} supporters have a reason to raise the standard. The next result now has something specific to answer to.`,
    r=>`The mood around ${r} is useful evidence of expectation, not evidence that the expectation is correct. Week 3 will separate the two.`,
    r=>`${r} fans are reacting to something real. The question is whether the roster gives them the same reason again.`,
    r=>`Public confidence around ${r} should remain conditional. Another result can strengthen the case or reopen it immediately.`,
    r=>`${r} supporters do not need a narrative; they need confirmation. Week 3 is the next available test.`,
    r=>`The pressure around ${r} changed this week. Expectations moved, and the roster now has to perform against the new standard.`,
    r=>`${r} fans have enough evidence for an opinion, not a conclusion. That distinction matters more once the next kickoff arrives.`,
    r=>`The crowd around ${r} is no longer waiting for a first impression. It is waiting to see whether the second one survives contact with Week 3.`
  ]
};

function replaceVoice(team,index){
  const a=team?.inquirer_article;if(!a||!Array.isArray(a.sections))return team;
  const who=reporter(a),ref=shortRef(team),pts=score(team);
  for(const k of ['management','sentiment']){
    const s=section(a,k);if(!s||!Array.isArray(s.paragraphs))continue;
    s.paragraphs=s.paragraphs.filter(p=>!OLD_ADDED.test(String(p||'')));
    if(k==='management'){
      const set=MGMT[who]||MGMT['Nick Swindell'];
      const fn=(actionableManagement(s)?set.yes:set.no)[index%8];
      s.paragraphs.push(fn(ref));
    }else{
      const fn=(SENT[who]||SENT['Nick Swindell'])[index%8];
      s.paragraphs.push(fn(ref,Number.isFinite(pts)?pts:'that'));
    }
  }
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r167';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR166(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const counts=new Map();
  out.teams=(out.teams||[]).map(team=>{
    const who=reporter(team?.inquirer_article);
    const i=counts.get(who)||0;counts.set(who,i+1);
    return replaceVoice(team,i);
  });
  if(out.league_overview)out.league_overview.structure_revision='week2-r167';
  out.structure_revision='week2-r167';
  return out;
}

export const applyWeek2EditorialR167=applyWeek2EditorialR16;
