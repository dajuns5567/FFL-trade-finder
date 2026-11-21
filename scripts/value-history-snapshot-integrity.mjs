// Guard immutable Value History against a correlated, short-lived market snapback.
// Called only after the archive writer has confirmed three observations belong
// to the same valuation-model era. This module never modifies snapshot values.
const MAX_WINDOW_MS=18*60*60*1000;
const MIN_REVERSAL_POINTS=75;
const MIN_AFFECTED_PLAYERS=12;
const MAX_EXAMPLE_PLAYERS=8;

const timestamp=s=>{
 const n=Date.parse(String(s?.t||''));
 return Number.isFinite(n)?n:null;
};
const valuesByPlayer=s=>{
 const out=new Map();
 for(const row of Array.isArray(s?.rows)?s.rows:[]){
  if(row?.id===null||row?.id===undefined||row?.value===null||row?.value===undefined)continue;
  const id=String(row.id),value=Number(row.value);
  if(id&&Number.isFinite(value)&&!out.has(id))out.set(id,value);
 }
 return out;
};

/**
 * Returns a read-only decision for consecutive snapshots in the same era.
 * Two movements of at least 75 points in opposite directions, within 18h
 * across >=12% (and at least 12) of matched players, indicate a cohort
 * instability. A small set of authentic individual movers remains permitted.
 * The archive writer stops *before its first write* when ok is false.
 */
export function inspectShortTermSnapback(first,middle,last){
 const start=timestamp(first),mid=timestamp(middle),end=timestamp(last);
 const withinWindow=start!==null&&mid!==null&&end!==null&&
  start<=mid&&mid<=end&&end-start<=MAX_WINDOW_MS;
 const a=valuesByPlayer(first),b=valuesByPlayer(middle),c=valuesByPlayer(last);
 let comparable=0,affected=0;
 const examples=[];
 for(const [id,v1] of a){
  if(!b.has(id)||!c.has(id))continue;
  comparable++;
  const v2=b.get(id),v3=c.get(id),firstMove=v2-v1,nextMove=v3-v2;
  if(!withinWindow)continue;
  const reversal=(firstMove>=MIN_REVERSAL_POINTS&&nextMove<=-MIN_REVERSAL_POINTS)||
   (firstMove<=-MIN_REVERSAL_POINTS&&nextMove>=MIN_REVERSAL_POINTS);
  if(!reversal)continue;
  affected++;
  if(examples.length<MAX_EXAMPLE_PLAYERS)
   examples.push({id,first:v1,middle:v2,last:v3,firstMove,nextMove});
 }
 const threshold=Math.max(MIN_AFFECTED_PLAYERS,Math.ceil(comparable*0.12));
 return {ok:!withinWindow||affected<threshold,affected,comparable,threshold,examples};
}
