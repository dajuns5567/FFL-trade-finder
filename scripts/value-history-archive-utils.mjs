export function emptyMonthBundle(month){
  return {schema_version:1,league_id:'1316867686394769408',month:String(month||''),snapshots:[]};
}
export function parseMonthBundleText(content,month){
  const text=String(content??'').trim();
  if(!text)return null;
  try{
    const parsed=JSON.parse(text);
    if(!parsed||!Array.isArray(parsed.snapshots))return null;
    return {
      schema_version:Number(parsed.schema_version)||1,
      league_id:String(parsed.league_id||'1316867686394769408'),
      month:String(parsed.month||month||''),
      snapshots:parsed.snapshots
    };
  }catch{
    return null;
  }
}
