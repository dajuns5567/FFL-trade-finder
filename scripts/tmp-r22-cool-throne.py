from pathlib import Path
p=Path('netlify/functions/inquirer-week2-editorial-r22.mjs')
s=p.read_text()
anchor="function finalArticleCleanup(t,sections){"
helper=r'''function ensureCoolThroneRecognition(t,sections){
 const starters=[...(t?.starter_details||[])];
 const eligible=starters.filter(p=>{
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
 }).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
 if(eligible.length<2)return sections;
 const names=eligible.map(p=>String(p?.name||'').trim()).filter(Boolean);
 if(names.length<2)return sections;
 const id=reporterId(t),pair=`${names[0]} and ${names[1]}`;
 const lines={
  'walter-mercer':`${pair} both earned the compliment here. I am not rationing credit just because praise makes me uncomfortable.`,
  'tess-delaney':`${pair} both earned applause. Fine, there is enough champagne for two.`,
  'mack-hollis':`${pair} both earned roses. The stage can survive two bows without losing the plot.`,
  'nora-voss':`${pair} both earned credit. Two good performances deserve two names, not another theory.`
 };
 return (sections||[]).map(sec=>{
  if(String(sec?.kind||'')!=='cool-throne')return sec;
  const ps=[...(sec?.paragraphs||[])].filter(Boolean),copy=ps.join(' ').toLowerCase();
  if(names.every(n=>copy.includes(n.toLowerCase())))return sec;
  const line=lines[id]||lines['walter-mercer'];
  if(ps.length)ps[0]=`${line} ${ps[0]}`.trim();else ps.push(line);
  return{...sec,paragraphs:ps};
 });
}

'''
if helper not in s:
    if anchor not in s: raise SystemExit('final cleanup anchor missing')
    s=s.replace(anchor,helper+anchor,1)
old=" out=dedupePlayerFacts(t,out);\n const major=new Set(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook']);"
new=" out=dedupePlayerFacts(t,out);\n out=ensureCoolThroneRecognition(t,out);\n const major=new Set(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook']);"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('cool-throne integration anchor missing')
p.write_text(s)
