import fs from 'node:fs';
import vm from 'node:vm';

const loaders=[
  fs.readFileSync('netlify/functions/site-v17.mjs','utf8'),
  fs.readFileSync('netlify/functions/site-v29.mjs','utf8')
];
const srcs=[...new Set(loaders.flatMap(source=>[...source.matchAll(/src="\/([^"?]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1])))];
const failures=[];
for(const path of srcs){
  try{
    const source=fs.readFileSync(path,'utf8');
    new vm.Script(source,{filename:path});
  }catch(e){
    failures.push({path,error:String(e?.message||e)});
  }
}
const html=fs.readFileSync('index.html','utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
inline.forEach((source,i)=>{
  try{new vm.Script(source,{filename:`index.html:inline-${i+1}`})}
  catch(e){failures.push({path:`index.html:inline-${i+1}`,error:String(e?.message||e)})}
});
if(failures.length){
  console.error(JSON.stringify({ok:false,checkedExternal:srcs.length,checkedInline:inline.length,failures},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,checkedExternal:srcs.length,checkedInline:inline.length},null,2));
