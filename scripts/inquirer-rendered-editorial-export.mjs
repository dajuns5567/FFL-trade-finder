import fs from 'node:fs';
import week4FastHandler from '../netlify/functions/league-hub-week4-fast.mjs';
const response=await week4FastHandler();
if(response.status!==200)throw Error('Week 4 fast route returned '+response.status);
const edition=await response.json();
if(edition.teams?.length!==32)throw Error('Expected exactly 32 finished Week 4 articles');
const data={season:edition.season,week:edition.week,recap:edition.league_overview,teams:edition.teams.map(t=>({team:t.team_name,roster_id:t.roster_id,points:t.points,opponent:t.opponent_name,opponent_points:t.opponent_points,starters:t.starter_details,article:t.inquirer_article}))};
fs.writeFileSync('/tmp/inquirer-week4-rendered-editorial.json',JSON.stringify(data,null,2));
console.log('EXPORTED_RENDERED_EDITORIAL '+JSON.stringify({teams:data.teams.length,recap:!!data.recap,bytes:fs.statSync('/tmp/inquirer-week4-rendered-editorial.json').size}));
