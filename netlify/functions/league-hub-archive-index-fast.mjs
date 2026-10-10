import {getStore} from '@netlify/blobs';

const staticRows=[
  {type:'week',season:2026,week:1,key:'preloaded:2026:1',preloaded:true},
  {type:'week',season:2026,week:2,key:'preloaded:2026:2',preloaded:true},
  {type:'week',season:2026,week:3,key:'preloaded:2026:3',preloaded:true}
];

export default async()=>{
  let rows=staticRows.slice();
  try{
    const stored=await getStore('fleeced-league-hub',{consistency:'strong'}).get('broadcasts/index.json',{type:'json'}).catch(()=>[]);
    if(Array.isArray(stored)){
      const seen=new Set(rows.map(x=>`${Number(x.season)}|${Number(x.week)}`));
      for(const x of stored){
        const key=`${Number(x?.season)}|${Number(x?.week)}`;
        if(Number(x?.season)&&Number(x?.week)&&!seen.has(key)){rows.push(x);seen.add(key)}
      }
    }
  }catch{}
  rows.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
  return new Response(JSON.stringify({reports:rows}),{status:200,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'public, max-age=30, stale-while-revalidate=300',
    'netlify-cdn-cache-control':'public, max-age=60, stale-while-revalidate=600',
    'x-fleeced-archive-index-fast':'1'
  }});
};
