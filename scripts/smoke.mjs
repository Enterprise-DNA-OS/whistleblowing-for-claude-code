// npm test: a scratch database, migrate, seed, every command, assertions, PASS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { execute } from './speakup.mjs';

const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'whistleblowing-test-'));
const shared=process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL=shared||'';process.env.DATA_DIR=path.join(scratch,'db');process.env.OUTPUT_DIR=path.join(scratch,'output');
const db=await getDb();let checks=0,dbClosed=false;
const test=async(name,fn)=>{await fn();checks++;console.log('ok '+checks+' '+name);};
const run=(...args)=>execute(db,args);
const bad=async(args,re)=>assert.rejects(()=>run(...args),re);
const rows=(sql)=>db.query(sql);
const fixture=(name,text)=>{const p=path.join(scratch,name);fs.writeFileSync(p,text);return p;};
const day=async(n)=>(await rows(`select (current_date+${n})::text d`))[0].d;
const READS=['reports','closed','actions','contacts','identity','retaliation','workload','entities','people','trends','attention','compliance','notes','audit','settings','holidays'];
try{
 await test('migrations and seed are repeatable',async()=>{assert.equal((await migrate(db)).ran.length,1);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);
  assert.equal((await run('reports')).length,6);assert.equal((await run('closed')).length,4);});
 await test('every read command returns records',async()=>{for(const r of READS)assert(Array.isArray(await run(r)),r);assert.match((await run('help')).help,/disclose <report>/);});
 await test('the demo raises every kind of attention item and compliance rule, each with a source',async()=>{
  const a=await run('attention');for(const c of ['Compliance','Unassigned','High severity, no next step','Overdue action','Overdue step','Discloser not updated','Outcome not told','Protection not assessed','Quiet case','Past target','Training','Retaliation check due'])assert(a.some(x=>x.category===c),c);
  const comp=await run('compliance');for(const r of ['ACKNOWLEDGE','NZ-20-WORKING-DAYS','IDENTITY','POLICY','PUBLIC-INTEREST','RETALIATION'])assert(comp.some(x=>x.rule===r),r);assert(comp.every(x=>x.source));
  assert(!comp.some(x=>x.ref==='E-WH'),'a small proprietary company is not required to hold a policy');});
 await test('working days skip weekends and the holidays table',async()=>{
  assert.equal((await rows("select add_working_days('2026-10-23',1)::text d"))[0].d,'2026-10-27');
  assert.equal((await rows("select add_working_days('2026-12-24',1)::text d"))[0].d,'2026-12-29');
  assert.equal((await rows("select working_days_between('2026-10-23','2026-10-30') n"))[0].n,4);
  await run('holiday','2026-10-29','--name=Test anniversary day');assert.equal((await rows("select working_days_between('2026-10-23','2026-10-30') n"))[0].n,3);
  await bad(['holiday','2026-02-30','--name=x'],/Invalid calendar date/);});
 await test('names resolve by ref, alias, name and id prefix; ambiguity lists candidates',async()=>{
  assert.equal((await run('card','report','blue kea'))[0].ref,'WB-101');assert.equal((await run('card','person','aroha'))[0].ref,'O-01');
  const r=(await run('card','report','WB-102'))[0];assert.equal((await run('card','report',r.id.slice(0,8)))[0].ref,'WB-102');
  await bad(['card','report','Discloser WB-10'],/Ambiguous[\s\S]*WB-105[\s\S]*WB-107/);await bad(['card','person','nobody'],/No person/);});
 await test('intake to close: assign, acknowledge, assess, investigate, act, close, tell the outcome',async()=>{
  await run('add','report','--ref=WB-201','--entity=E-NZ','--channel=hotline','--alias=Tui','--contact-route=Hotline PIN 9001','--category=safety','--summary=Guard missing on the conveyor','--severity=high');
  await bad(['investigate','WB-201'],/needs a case officer/);
  await bad(['assign','WB-201','--officer=Morgan Hale'],/officer role/);
  await run('assign','WB-201','--officer=Aroha Kingi');assert.equal((await run('card','report','WB-201'))[0].status,'assessing');
  await bad(['investigate','WB-201'],/Acknowledge the discloser/);
  await run('acknowledge','WB-201');await bad(['acknowledge','WB-201'],/was acknowledged/);
  assert((await run('contacts')).some(c=>c.report==='WB-201'&&c.direction==='to_discloser'));
  await bad(['assess','WB-201','--protection=maybe','--note=x'],/protected or not-protected/);
  await run('assess','WB-201','--protection=protected','--note=Employee reporting a serious safety risk');
  await run('investigate','WB-201','--next-step=Inspect the conveyor','--due='+(await day(3)));
  await run('add','action','--ref=A-201','--report=WB-201','--description=Inspect the conveyor','--owner=O-01','--due='+(await day(3)));
  await bad(['add','action','--ref=A-202','--report=WB-201','--description=x','--owner=Jo Whitcombe','--due='+(await day(3))],/case officer or investigator/);
  await bad(['close','WB-201','--finding=substantiated','--outcome=Guard refitted'],/open actions: A-201/);
  await bad(['done','A-201'],/--result is required/);await run('done','A-201','--result=Guard was missing; refitted the same day');
  await bad(['close','WB-201','--finding=maybe','--outcome=x'],/must be one of/);
  const [c]=await run('close','WB-201','--finding=substantiated','--outcome=Guard refitted and daily checks added');
  assert.equal(c.status,'closed');assert.match(c.retaliation_checks_scheduled,/RC-\d+, RC-\d+/);
  assert((await run('attention')).some(x=>x.ref==='WB-201'&&x.category==='Outcome not told'));
  await run('told-outcome','WB-201');assert(!(await run('attention')).some(x=>x.ref==='WB-201'));
  await bad(['set','report','WB-201','--status=received'],/Unknown report field --status[\s\S]*assign, investigate or close/);
  await bad(['close','WB-201','--finding=no-action','--outcome=x'],/already closed/);});
 await test('protection must be assessed before close; no-route cases cannot be acknowledged',async()=>{
  await run('assign','WB-103','--officer=O-03');await run('acknowledge','WB-103','--text=Thanks, we have this.');
  await bad(['close','WB-103','--finding=no-action','--outcome=x'],/no protection assessment/);
  await bad(['acknowledge','WB-107'],/no contact route/);
  await bad(['add','report','--ref=WB-202','--entity=E-NZ','--anonymous=no','--summary=x'],/check constraint/);});
 await test('updates clear the overdue flags; the 20 working day rule needs an update after acknowledging',async()=>{
  assert((await run('compliance')).some(x=>x.ref==='WB-101'&&x.rule==='NZ-20-WORKING-DAYS'));
  await run('update','WB-101','--text=Investigation under way; interviews this week.');
  assert(!(await run('compliance')).some(x=>x.ref==='WB-101'));assert(!(await run('attention')).some(x=>x.ref==='WB-101'&&x.category==='Discloser not updated'));
  await run('heard','WB-101','--text=Sent a photo of a fuel receipt.');
  await run('step','WB-101','--next-step=Interview the depot supervisor','--due='+(await day(4)));assert(!(await run('attention')).some(x=>x.ref==='WB-101'&&x.category==='Overdue step'));
  await run('acknowledge','WB-104');await run('assess','WB-104','--protection=protected','--note=Serious risk to health and safety');
  assert(!(await run('compliance')).some(x=>x.ref==='WB-104'&&x.rule==='ACKNOWLEDGE'));});
 await test('identity register: an "other" basis needs a note and is flagged; consent is not',async()=>{
  await bad(['disclose','WB-108','--told=Yard manager','--by=O-03','--basis=other'],/check constraint/);
  await bad(['disclose','WB-108','--told=Yard manager','--by=Audit and Risk Committee','--basis=consent'],/officer, recipient or investigator/);
  await run('disclose','WB-108','--told=Police, Tauranga','--by=O-03','--basis=police');
  assert(!(await run('compliance')).some(x=>x.ref==='WB-108'));assert((await run('identity')).some(x=>x.report==='WB-108'&&x.basis==='police'));});
 await test('retaliation checks, training and policy reviews clear their flags',async()=>{
  await bad(['check','RC-02','--result=concern'],/--note is required/);await run('check','RC-02','--result=no-concern');
  assert(!(await run('compliance')).some(x=>x.rule==='RETALIATION'&&x.ref==='WB-105'));
  await run('trained','R-01');await run('trained','Ben Lacey');assert(!(await run('attention')).some(x=>x.category==='Training'));
  await run('policy','E-AU');assert(!(await run('compliance')).some(x=>x.rule==='POLICY'));
  await run('set','entity','E-WH','--kind=large_proprietary');assert((await run('compliance')).some(x=>x.rule==='POLICY'&&x.ref==='E-WH'));});
 await test('case records cannot be deleted, and every change is audited',async()=>{
  await assert.rejects(()=>rows("delete from reports where ref='WB-110'"),/never deleted/);
  await assert.rejects(()=>rows("delete from identity_disclosures where ref='ID-02'"),/never deleted/);
  assert((await rows("select * from audit_events where entity='reports' and action='UPDATE'")).length>0);});
 await test('input validation: dates, booleans, unknown fields and options',async()=>{
  await bad(['set','report','WB-108','--next-step-due=2026-02-30'],/Invalid calendar date/);await bad(['set','report','WB-108','--anonymous=perhaps'],/yes or no/);
  await bad(['set','report','WB-108','--colour=red'],/Unknown report field/);await bad(['acknowledge','WB-108','--fast'],/Unknown option/);await bad(['reports','extra'],/take no filters/);});
 await test('EthicsPoint case list import: dry run, repeat, mapping, warnings, roll back on a bad row',async()=>{
  const f=fixture('cases.csv','﻿Report Key,Organization,Date Received,Intake Method,Anonymous,Primary Issue,Location,Summary,Priority,Case Status,Case Manager,Date Acknowledged,Date Closed,Finding,Resolution\r\n'+
   'EP-1,Kowhai Freight Ltd,03/02/2026,Telephone,Yes,Accounting and Auditing,Wellington,"Invoices split to dodge approval limit, twice",High,Closed,Aroha Kingi,04/02/2026,20/03/2026,Substantiated,Approval limits reset; manager warned\r\n'+
   'EP-2,Kowhai Pacific Ltd,2026-05-01,Web,No,Gifts and Entertainment,Suva,Supplier paid for a staff trip,Medium,Under Investigation,Ben Lacey,,,,\r\n'+
   'EP-3,Kowhai Freight Ltd,2026-06-10,Web,Yes,Space Weather,,Odd report,Low,Closed,,,,,\r\n');
  const dry=await run('import','ethicspoint','--file='+f,'--dry-run');assert.equal(dry.rows,3);assert.equal((await rows("select * from reports where ref like 'EP-%'")).length,0);
  const res=await run('import','ethicspoint','--file='+f);
  assert(res.warnings.some(w=>/EP-2: no acknowledgement date/.test(w)));assert(res.warnings.some(w=>/EP-3: closed in EthicsPoint/.test(w)));assert(res.warnings.some(w=>/space weather/.test(w)));assert(res.warnings.some(w=>/Kowhai Pacific Ltd/.test(w)));
  const e1=(await run('card','report','EP-1'))[0];assert.equal(e1.status,'closed');assert.equal(e1.category,'financial_reporting');assert.equal(e1.received_on,'2026-02-03');assert.equal(e1.finding,'substantiated');assert.equal(e1.channel,'hotline');
  const e2=(await run('card','report','EP-2'))[0];assert.equal(e2.status,'assessing');assert.equal(e2.category,'conflict_of_interest');assert.equal(e2.anonymous,false);
  assert.equal((await run('card','report','EP-3'))[0].status,'received');
  const again=await run('import','ethicspoint','--file='+f);assert(again.records.every(r=>r.action==='updated'));assert.equal((await rows("select * from reports where ref like 'EP-%'")).length,3);
  const f2=fixture('mapped.csv','Case,Company,Issue,What happened\nEP-4,Kowhai Freight Ltd,Bribery,Cash offered for a contract\n');const map=fixture('map.json',JSON.stringify({ref:'Case',entity:'Company',category:'Issue',summary:'What happened'}));
  await run('import','ethicspoint','--file='+f2,'--mapping='+map,'--jurisdiction=AU');assert.equal((await run('card','report','EP-4'))[0].category,'corruption');
  await bad(['import','ethicspoint','--file='+f2,'--mapping='+fixture('badmap.json','{"ref":"Nope"}')],/must name a column/);
  const n=(await rows('select count(*)::int n from audit_events'))[0].n;
  const broken=fixture('broken.csv','Report Key,Organization,Summary,Case Status,Case Manager\nEP-5,Kowhai Freight Ltd,Fine,Open,\nEP-6,Kowhai Freight Ltd,Bad,Open,Nobody Here\n');
  await bad(['import','ethicspoint','--file='+broken],/CSV row 3: No person/);assert.equal((await rows("select * from reports where ref='EP-5'")).length,0);assert.equal((await rows('select count(*)::int n from audit_events'))[0].n,n);});
 await test('reviews and drafts hold the real records; the board report carries no case detail',async()=>{
  const w=await run('weekly-review');assert.deepEqual(w.attention,await run('attention'));assert.deepEqual(w.workload,await run('workload'));
  const b=await run('board-report');const flat=JSON.stringify(b);assert(b.open_cases.some(x=>x.ref==='WB-102'));
  for(const secret of ['Blue Kea','Hotline PIN','Fuel cards','Supplier contact'])assert(!flat.includes(secret),secret);
  for(const cmd of [['draft-weekly-review'],['draft-board-report'],['draft-acknowledgement','WB-108'],['draft-update','WB-102'],['draft-outcome','WB-106'],['draft-case-file','WB-101']]){const out=await run(...cmd);assert(fs.readFileSync(out.file,'utf8').includes('DRAFT'),cmd[0]);}
  assert(fs.readFileSync((await run('draft-acknowledgement','WB-108')).file,'utf8').includes('Kahu'));
  assert(!fs.readFileSync((await run('draft-board-report')).file,'utf8').includes('Blue Kea'));
  await bad(['draft-outcome','WB-102'],/not closed/);await bad(['draft-update','WB-107'],/no contact route/);
  const dir=path.join(scratch,'export');const e=await run('export','--out='+dir);assert(e.counts.reports>=13);assert(fs.existsSync(path.join(dir,'identity_disclosures.csv')));await bad(['export','--out='+dir],/EEXIST/);});
 await test('HTML escapes user data',async()=>{await run('set','report','WB-108','--alias=<script>alert(1)</script>');const html=fs.readFileSync((await run('draft-acknowledgement','WB-108')).file,'utf8');assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>alert'));});
 await db.close();dbClosed=true;
 if(!shared){
  await test('the CLI exits 1 and lists candidates when a name is ambiguous',async()=>{const p=spawnSync(process.execPath,['scripts/speakup.mjs','card','report','Discloser WB-10','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,1);assert.match(p.stderr,/WB-105[\s\S]*WB-107/);});
  await test('dashboards and documents render from the same data',async()=>{for(const name of ['view','docs']){const p=spawnSync(process.execPath,[`scripts/${name}.mjs`],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
   for(const v of ['week','deadlines','programme'])assert(fs.existsSync(path.join(process.env.OUTPUT_DIR,'views',v+'.html')),v);
   for(const d of ['case-file','board-report','policy-attestation'])assert(fs.readdirSync(path.join(process.env.OUTPUT_DIR,'docs-out',d)).length>0,d);});
 }
 console.log(`PASS: ${checks} end-to-end checks on an isolated ${shared?'Postgres':'embedded'} database; every CLI command exercised.`);
}finally{if(!dbClosed)await db.close();fs.rmSync(scratch,{recursive:true,force:true});}
