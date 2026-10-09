import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {finalizeReporterUniqueness} from '../netlify/functions/inquirer-forward-restore-voice.mjs';
const edition={week:11,teams:[{
 roster_id:1,team_name:'Green Bay Packers',starter_details:[{name:'Player One',points:12}],
 inquirer_article:{sections:[
  {kind:'lede',paragraphs:['Green Bay Packers have a win this week. Green Bay Packers played hard this week. Green Bay Packers made an adjustment. Green Bay Packers need to improve.']},
  {kind:'cool-throne',paragraphs:['Green Bay Packers enjoyed a starter performance.']}
 ]}
}],league_overview:{sections:[{paragraphs:['Broadly, The Week 11 score matters. Accordingly, A second result matters. For now, Another matchup awaits.']}]}};
const checked=finalizeReporterUniqueness(edition,null);
const sections=checked.teams[0].inquirer_article.sections;
assert(sections.every(s=>s.paragraphs?.length),'Final dedupe must not leave an article section empty');
const copy=checked.teams[0].inquirer_article.paragraphs.join(' ');
assert((copy.match(/Green Bay Packers/g)||[]).length>=1,'Preserve verified team references');
assert((copy.match(/(?:^|[.!?]\s+)Green Bay Packers /g)||[]).length<=3,'Cap repeated team-name sentence leads');
const recap=checked.league_overview.sections[0].paragraphs.join(' ');
assert(!/\b(Broadly|Accordingly|For now),?\b/i.test(recap),'No mechanical recap transitions');
assert(/Week 11 score matters/.test(recap)&&/second result matters/i.test(recap),'Preserve substance when removing transitions');
const endpoint=readFileSync('netlify/functions/league-hub-week4-fast.mjs','utf8');
const frontend=readFileSync('league-hub-v451.js','utf8');
assert(endpoint.includes("'netlify-cdn-cache-control':'no-store"),'Week 4 fast route must bypass stale CDN cache');
assert(frontend.includes("cache:(y===2026&&w===4)?'no-store'"),'Week 4 archive fetch must bypass stale browser cache');
console.log('Final Week 11 copy, recap transitions and Week 4 cache protections pass');