export const PLAYER_SIGNAL_VERSION=1;

const DEFENSIVE_RE=/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT|EDGE|IDP)$/;
export const PLAYER_SIGNAL_LABELS={
  breakout:'Breakout',
  emerging:'Emerging',
  'established-star':'Established Star',
  'struggling-star':'Struggling Star',
  'declining-veteran':'Declining Veteran',
  struggling:'Struggling',
  'reliable-veteran':'Reliable Veteran',
  reliable:'Reliable',
  'star-level':'Star-Level Week',
  rookie:'Rookie',
  'young-player':'Young Player',
  veteran:'Veteran',
  surging:'Surging',
  cooling:'Cooling',
  stable:'Stable',
  unclassified:'No Active Signal'
};

export function reporterPlayerStatusProfile(p,slot=0,pp=null){
  const pts=Number(p?.points),week1=Number(pp?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,
    seasonAvg=Number(p?.season_avg),age=Number(p?.age),years=Number(p?.years_exp),
    pos=String(p?.position||'').toUpperCase(),role=Number(slot)||0,
    snaps=p?.current_snap_count==null?null:Number(p.current_snap_count),priorSnapPg=p?.prior_season_snaps_per_game==null?null:Number(p.prior_season_snaps_per_game),
    snapPct=p?.current_snap_pct==null?null:Number(p.current_snap_pct),
    defensive=DEFENSIVE_RE.test(pos),
    starThreshold=pos==='QB'?18:pos==='RB'?14:pos==='WR'?14:pos==='TE'?11:defensive?11:13,
    rookie=(Number.isFinite(years)&&years===0)||(games===0&&Number.isFinite(age)&&age<=23),
    young=(Number.isFinite(age)&&age<=25)||(Number.isFinite(years)&&years<=2),
    earlyCareer=(Number.isFinite(years)&&years<=2)||(Number.isFinite(age)&&age<=24&&(!Number.isFinite(years)||years<=3)),
    veteran=(Number.isFinite(years)&&years>=5)||(Number.isFinite(age)&&age>=28),
    hasTwoWeeks=Number.isFinite(pts)&&Number.isFinite(week1),
    established=Number.isFinite(prior)&&games>=8&&(prior>=starThreshold*1.2||(prior>=starThreshold&&(!Number.isFinite(years)||years>=1))),
    roleLift=(Number.isFinite(snapPct)&&snapPct>=0.55)||
      (Number.isFinite(snaps)&&Number.isFinite(priorSnapPg)&&priorSnapPg>0&&snaps>=Math.max(20,priorSnapPg*1.1))||
      (Number.isFinite(snaps)&&snaps>=(defensive?32:35)),
    twoWeekRise=hasTwoWeeks&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      seasonAvg>=Math.max(prior*1.25,prior+2,starThreshold*.75)&&
      Math.min(pts,week1)>=Math.max(prior*.8,starThreshold*.5),
    strongTwoWeekRise=hasTwoWeeks&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      seasonAvg>=Math.max(prior*1.4,prior+3,starThreshold*.9)&&
      Math.min(pts,week1)>=Math.max(prior*.9,starThreshold*.6),
    twoWeekDrop=hasTwoWeeks&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      seasonAvg<=prior*.75&&Math.max(pts,week1)<=prior*.85,
    steady=hasTwoWeeks&&games>=8&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      Math.abs(seasonAvg-prior)<=Math.max(1.5,prior*.18)&&
      Math.min(pts,week1)>=prior*.6&&Math.max(pts,week1)<=prior*1.4,
    developmentalBreakout=earlyCareer&&games>=6&&Number.isFinite(prior)&&prior>0&&prior<starThreshold*1.4&&strongTwoWeekRise&&roleLift;
  let status='';
  if(!Number.isFinite(pts))return{status:'',starThreshold,rookie,young,earlyCareer,veteran,established,roleLift,hasTwoWeeks,twoWeekRise,strongTwoWeekRise,twoWeekDrop,steady,developmentalBreakout};
  if(developmentalBreakout)status='breakout';
  else if(established&&veteran&&twoWeekDrop)status='declining-veteran';
  else if(established&&twoWeekDrop)status='struggling-star';
  else if(established)status='established-star';
  else if(!established&&young&&games>=6&&strongTwoWeekRise&&roleLift)status='breakout';
  else if(!established&&(young||earlyCareer)&&games>=6&&twoWeekRise)status='emerging';
  else if(veteran&&twoWeekDrop)status='declining-veteran';
  else if(games>=6&&Number.isFinite(prior)&&prior>=Math.max(7,starThreshold*.65)&&twoWeekDrop)status='struggling';
  else if(steady)status=veteran?'reliable-veteran':'reliable';
  else if(role===0&&pts>=starThreshold*1.6)status='star-level';
  else if(rookie&&hasTwoWeeks&&roleLift)status='rookie';
  else if(young&&hasTwoWeeks&&roleLift)status='young-player';
  else if(veteran&&pts>=Math.max(5,starThreshold*.5))status='veteran';
  const lift=Number.isFinite(seasonAvg)&&Number.isFinite(prior)?seasonAvg-prior:null,
    breakoutScore=(status==='breakout'?100:status==='emerging'?60:0)+(young?18:0)+(roleLift?18:0)+(Number.isFinite(lift)?Math.max(0,lift):0);
  return{status,starThreshold,rookie,young,earlyCareer,veteran,established,roleLift,hasTwoWeeks,twoWeekRise,strongTwoWeekRise,twoWeekDrop,steady,developmentalBreakout,breakoutScore,age,years,snaps,priorSnapPg,snapPct,seasonAvg,prior,week1,pts};
}

export function recentFormProfile(series=[]){
  const rows=(series||[]).filter(x=>Number.isFinite(Number(x?.points))).map(x=>({...x,points:Number(x.points)})),
    last3=rows.slice(-3),prior3=rows.slice(-6,-3),
    last3Avg=last3.length?last3.reduce((n,x)=>n+x.points,0)/last3.length:null,
    prior3Avg=prior3.length?prior3.reduce((n,x)=>n+x.points,0)/prior3.length:null,
    delta=Number.isFinite(last3Avg)&&Number.isFinite(prior3Avg)?last3Avg-prior3Avg:null,
    label=last3.length===3&&prior3.length>=2&&Number.isFinite(delta)&&delta>=3&&last3Avg>=prior3Avg*1.2?'hot':
      last3.length===3&&prior3.length>=2&&Number.isFinite(delta)&&delta<=-3&&last3Avg<=prior3Avg*.8?'cold':
      last3.length===3?'steady':'insufficient';
  return{games:rows.length,last3_avg:last3Avg,prior3_avg:prior3Avg,delta,label,series:rows};
}

function normalizedState(profile,form){
  const status=String(profile?.status||'');
  if(status==='breakout')return'breakout';
  if(status==='emerging')return'emerging';
  if(['declining-veteran','struggling-star','struggling'].includes(status))return'declining';
  if(['reliable-veteran','reliable'].includes(status))return'stable';
  if(status==='established-star')return'established';
  if(String(form?.label||'')==='hot')return'surging';
  if(String(form?.label||'')==='cold')return'cooling';
  if(String(form?.label||'')==='steady')return'stable';
  if(status)return status;
  return'unclassified';
}
function signalConfidence(profile,form){
  const status=String(profile?.status||''),games=Number(profile?.games||0)||Number(form?.games||0);
  if(['breakout','declining-veteran','struggling-star'].includes(status)&&profile?.hasTwoWeeks&&Number(profile?.prior)>0)return'strong';
  if(['established-star','reliable-veteran','reliable','emerging','struggling'].includes(status))return'established';
  if(['hot','cold'].includes(String(form?.label||''))&&Number(form?.games)>=5)return'established';
  if(status||Number(form?.games)>=3)return'early';
  return'insufficient';
}
function evidenceFor(profile,form){
  return{
    prior_season_games:Number(profile?.games)||0,
    prior_season_avg:Number.isFinite(Number(profile?.prior))?Number(profile.prior):null,
    season_avg:Number.isFinite(Number(profile?.seasonAvg))?Number(profile.seasonAvg):null,
    current_points:Number.isFinite(Number(profile?.pts))?Number(profile.pts):null,
    previous_week_points:Number.isFinite(Number(profile?.week1))?Number(profile.week1):null,
    current_snap_count:Number.isFinite(Number(profile?.snaps))?Number(profile.snaps):null,
    current_snap_pct:Number.isFinite(Number(profile?.snapPct))?Number(profile.snapPct):null,
    prior_snaps_per_game:Number.isFinite(Number(profile?.priorSnapPg))?Number(profile.priorSnapPg):null,
    role_lift:!!profile?.roleLift,
    established:!!profile?.established,
    two_week_rise:!!profile?.twoWeekRise,
    strong_two_week_rise:!!profile?.strongTwoWeekRise,
    two_week_drop:!!profile?.twoWeekDrop,
    steady:!!profile?.steady,
    developmental_breakout:!!profile?.developmentalBreakout,
    recent_form:String(form?.label||'insufficient'),
    recent_form_delta:Number.isFinite(Number(form?.delta))?Number(form.delta):null,
    last3_avg:Number.isFinite(Number(form?.last3_avg))?Number(form.last3_avg):null,
    prior3_avg:Number.isFinite(Number(form?.prior3_avg))?Number(form.prior3_avg):null
  };
}

export function buildPlayerSignal({player,previousPlayer=null,recentForm=null,season,week,previousSignal=null,slot=1}={}){
  const profile=reporterPlayerStatusProfile(player,slot,previousPlayer),form=recentForm||player?.recent_form||recentFormProfile([]),
    state=normalizedState(profile,form),reporterStatus=String(profile?.status||''),same=previousSignal&&String(previousSignal.state)===state,
    started_at=same&&previousSignal?.started_at?previousSignal.started_at:{season:Number(season)||null,week:Number(week)||null},
    duration_weeks=same?Math.max(1,Number(previousSignal?.duration_weeks)||1)+1:1,
    previous_state=previousSignal?.state||null,
    changed=!!previousSignal&&previous_state!==state;
  return{
    version:PLAYER_SIGNAL_VERSION,
    season:Number(season)||null,
    week:Number(week)||null,
    player_id:String(player?.id||''),
    player_name:String(player?.name||''),
    position:String(player?.position||''),
    nfl_team:String(player?.nfl_team||''),
    state,
    label:PLAYER_SIGNAL_LABELS[state]||state,
    reporter_status:reporterStatus||null,
    reporter_label:reporterStatus?(PLAYER_SIGNAL_LABELS[reporterStatus]||reporterStatus):null,
    momentum:String(form?.label||'insufficient'),
    confidence:signalConfidence(profile,form),
    previous_state,
    changed,
    started_at,
    duration_weeks,
    direction:['breakout','emerging','surging'].includes(state)?'positive':['declining','cooling','struggling','struggling-star','declining-veteran'].includes(state)?'negative':'neutral',
    evidence:evidenceFor(profile,form)
  };
}
