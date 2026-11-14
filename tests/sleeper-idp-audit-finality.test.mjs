import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {currentSeasonAuditGate} from '../scripts/qualified-player-game-audit-finality.mjs';

const finality={
  1:{complete:true,slots:[{state:'final',teams:['NYJ','BUF']}]},
  2:{complete:false,slots:[{state:'final',teams:['NYJ','NE']},{state:'blocking',teams:['DAL','PHI']}]}
};
const manifest=()=>({
 currentSeason:2026,currentSeasonCompletedWeek:1,
 currentLeagueScoringSettings:{idp_tkl_solo:2},
 qualifyingHistoricalSeasonMinimumGames:8,
 currentSeasonQualification:{
  weekFinalityByWeek:structuredClone(finality),
  finalTeamsByWeek:{1:['NYJ','BUF'],2:['NYJ','NE']}
 }
});
function runAudit({mutateStored=false,mutateManifest,mutateWeekly}={}){
 const dir=mkdtempSync(join(tmpdir(),'ffl-idp-audit-'));
 const write=(name,contents)=>{
  const target=join(dir,name);mkdirSync(join(target,'..'),{recursive:true});
  writeFileSync(target,JSON.stringify(contents));
 };
 const m=manifest();mutateManifest?.(m);write('manifest.json',m);
 write('players.json',{
  'bailey-id':{full_name:'David Bailey',team:'NYJ',position:'OLB',fantasy_positions:['LB']},
  'chris-a':{full_name:'Chris Jones',team:'BUF',position:'DT',fantasy_positions:['DL']},
  'chris-b':{full_name:'Chris Jones',team:'FA',position:'DL',fantasy_positions:['DL']}
 });
 const weekly={
  1:{
   'bailey-id':{def_snp:40,idp_tkl_solo:10},
   'chris-a':{def_snp:35,idp_tkl_solo:6},
   'chris-b':{def_snp:20,idp_tkl_solo:8}
  },
  2:{
   'bailey-id':{def_snp:45,idp_tkl_solo:9},
   'chris-a':{def_snp:35,idp_tkl_solo:7}
  }
 };
 mutateWeekly?.(weekly);write('2026/weekly-stats.json',weekly);
 write('2026/season-stats.json',{
  'bailey-id':{gp:1,def_snp:40,idp_tkl_solo:mutateStored?4:10},
  'chris-a':{gp:1,def_snp:35,idp_tkl_solo:6}
 });
 const script=fileURLToPath(new URL('../scripts/audit-qualified-player-games.mjs',import.meta.url));
 try{
  const run=spawnSync(process.execPath,[script],{
   env:{...process.env,SLEEPER_DATA_DIR:dir},
   encoding:'utf8',timeout:10000
  });
  return{status:run.status,stdout:run.stdout,stderr:run.stderr,
   report:run.status===0?JSON.parse(run.stdout):null};
 }finally{rmSync(dir,{recursive:true,force:true})}
}
test('uses only verified complete weeks and their finalized NFL teams',()=>{
 const gate=currentSeasonAuditGate(manifest());
 assert.equal(gate.completedWeek,1);
 assert.equal(gate.eligible(1,'NYJ'),true);
 assert.equal(gate.eligible(1,'BUF'),true);
 assert.equal(gate.eligible(1,'FA'),false);
 assert.equal(gate.eligible(2,'NYJ'),false);
 const result=runAudit();
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.report.summary.aggregateMismatches,0);
 assert.equal(result.report.years['2026'].rebuiltPlayers,2,
  'unverified FA Chris Jones must not be matched to the different verified Chris Jones');
 assert.equal(result.report.years['2026'].storedPlayers,2);
});
test('the audit still detects genuine scored-tackle discrepancies',()=>{
 const result=runAudit({mutateStored:true});
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.report.summary.aggregateMismatches,1);
 assert.equal(result.report.aggregateMismatches[0].name,'David Bailey');
 assert.equal(result.report.aggregateMismatches[0].rebuiltQualifyingPoints,20);
 assert.equal(result.report.aggregateMismatches[0].storedQualifyingPoints,8);
});
test('inconsistent completed-week metadata fails closed',()=>{
 const m=manifest();m.currentSeasonCompletedWeek=2;
 assert.throws(()=>currentSeasonAuditGate(m),/completed week/);
 const result=runAudit({mutateManifest:x=>x.currentSeasonCompletedWeek=2});
 assert.notEqual(result.status,0);
});
test('final-team manifest differing from verified game slots fails closed',()=>{
 const m=manifest();m.currentSeasonQualification.finalTeamsByWeek[1]=['NYJ','DAL'];
 assert.throws(()=>currentSeasonAuditGate(m),/final teams disagree/);
 const result=runAudit({mutateManifest:x=>x.currentSeasonQualification.finalTeamsByWeek[1]=['NYJ','DAL']});
 assert.notEqual(result.status,0);
});
test('blocked fantasy week cannot leak partial current-week scoring',()=>{
 const result=runAudit({mutateWeekly:w=>{w[2]['bailey-id'].idp_tkl_solo=100}});
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.report.summary.aggregateMismatches,0);
});
