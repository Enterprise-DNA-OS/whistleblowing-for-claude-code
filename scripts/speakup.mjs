#!/usr/bin/env node
// The one CLI for Whistleblowing for Claude Code. Every slash command is a recipe over this file.
// Human tables by default, --json for machines. Run `node scripts/speakup.mjs help`.
// The database never holds a discloser's name: reports carry an alias and a contact route.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick, yesNo } from './lib/csv.mjs';
import { table } from './lib/format.mjs';
import { page, table as htmlTable, writeOut, esc } from './lib/render.mjs';

export const entities = {
 entity: {table:'entities', fields:['ref','name','jurisdiction','kind','policy_on','policy_location','active']},
 person: {table:'people', fields:['ref','name','role','title','email','entity_id','trained_on','active']},
 report: {table:'reports', fields:['ref','entity_id','received_on','channel','received_by','anonymous','alias','contact_route','relationship','category','area','summary','severity','officer_id','regulator_told_on','next_step','next_step_due']},
 contact: {table:'contacts', fields:['ref','report_id','on_date','direction','method','summary']},
 action: {table:'actions', fields:['ref','report_id','description','owner_id','due_on']},
 disclosure: {table:'identity_disclosures', fields:['ref','report_id','on_date','told','told_by','basis','note']},
 check: {table:'retaliation_checks', fields:['ref','report_id','due_on','note']},
 note: {table:'notes', fields:['ref','report_id','body']},
};
// Status, acknowledgement, protection, closing and outcomes move only through their own commands,
// so every change of state leaves the trail an auditor or regulator expects.
const fk = {entity_id:'entity',officer_id:'person',received_by:'person',owner_id:'person',told_by:'person',report_id:'report'};
const alias = {entity:'entity_id',officer:'officer_id',owner:'owner_id',by:'told_by',report:'report_id',due:'due_on',date:'on_date'};
const DATES = ['policy_on','trained_on','received_on','regulator_told_on','next_step_due','on_date','due_on'];
const BOOLS = ['active','anonymous'];
const NULLABLE = new Set(['policy_on','trained_on','regulator_told_on','next_step_due','entity_id','officer_id','received_by']);
const OPEN = "status<>'closed'";
const reads = {
 reports:`select ref,entity,category,severity,status,officer,received_on,days_open,ack_due,acknowledged_on,protection,next_step,next_step_due from v_reports where ${OPEN} order by case severity when 'high' then 1 when 'medium' then 2 else 3 end,received_on,ref`,
 closed:"select ref,entity,category,received_on,closed_on,days_open,finding,outcome_told_on from v_reports where status='closed' order by closed_on desc,ref",
 actions:'select ref,report,owner,description,due_on,days_left from v_actions where done_on is null order by due_on,ref',
 contacts:'select c.ref,r.ref report,c.on_date,c.direction,c.method,c.summary from contacts c join reports r on r.id=c.report_id order by c.on_date desc,c.ref limit 50',
 identity:'select ref,report,on_date,told,told_by,basis,note from v_identity order by on_date desc,ref',
 retaliation:'select ref,report,report_status,officer,due_on,days_left,done_on,result,note from v_retaliation order by done_on nulls first,due_on,ref',
 workload:'select ref,name,open_cases,high_severity,overdue_actions,avg_days_to_close from v_workload order by open_cases desc,ref',
 entities:'select ref,name,jurisdiction,kind,policy_on,policy_review_due,reports_12m,open_cases,substantiated_12m from v_entities order by ref',
 people:'select p.ref,p.name,p.role,p.title,e.name entity,p.trained_on,p.email from people p left join entities e on e.id=p.entity_id where p.active order by p.role,p.ref',
 trends:'select quarter,category,reports,anonymous,substantiated,avg_days_to_close from v_trends order by quarter,reports desc,category',
 attention:'select priority,ref,category,detail from v_attention order by priority,category,ref,detail',
 compliance:'select ref,subject,rule,issue,source from v_compliance order by rule,ref',
 notes:'select n.ref,r.ref report,n.body,n.created_at from notes n join reports r on r.id=n.report_id order by n.created_at desc,n.ref limit 50',
 audit:'select entity,record_id,action,actor,created_at from audit_events order by created_at desc,id limit 100',
 settings:'select key,value,note from settings order by key',
 holidays:'select on_date,name from holidays order by on_date',
};
function parse(args){
 const pos=[],opts={};for(const a of args){if(!a.startsWith('--')){pos.push(a);continue;}const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(Object.hasOwn(opts,k))throw Error(`Repeated option --${k}`);opts[k]=i<0?true:a.slice(i+1);}return {pos,opts};
}
const required=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();};
export function dayDate(v){v=String(v).trim();const d=new Date(v+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error(`Invalid calendar date: ${v} (use YYYY-MM-DD)`);return v;}
function bool(v){const s=String(v).trim().toLowerCase();if(['yes','true','y','1'].includes(s))return true;if(['no','false','n','0'].includes(s))return false;throw Error(`Expected yes or no: ${v}`);}
export async function resolve(db,kind,value){
 const e=entities[kind];if(!e)throw Error(`Unknown record type ${kind}. Types: ${Object.keys(entities).join(', ')}`);required(value,kind);
 const label=e.fields.includes('name')?'name':e.fields.includes('alias')?'alias':'ref';
 let rows=await db.query(`select id,ref,${label} label from ${e.table} where lower(ref)=lower($1) or id::text=lower($1)`,[value]);
 if(!rows.length)rows=await db.query(`select id,ref,${label} label from ${e.table} where starts_with(id::text,lower($1)) or position(lower($1) in lower(${label}))>0 order by ref`,[value]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind} "${value}". Pick one:\n${rows.map(r=>`  ${r.ref}  ${r.label}  ${r.id}`).join('\n')}`:`No ${kind} matches "${value}"`);
 return rows[0].id;
}
async function values(db,kind,opts){
 const e=entities[kind];if(!e)throw Error(`Unknown record type ${kind}`);const vals={};
 for(const [raw,value] of Object.entries(opts)){
  if(raw==='json')continue;const k=alias[raw]||raw.replaceAll('-','_');
  if(!e.fields.includes(k)){const hint=['status','acknowledged_on','protection','closed_on','finding','outcome','outcome_told_on'].includes(k)?` Use the ${k.startsWith('ack')?'acknowledge':k==='protection'?'assess':k.startsWith('outcome_told')?'told-outcome':'assign, investigate or close'} command.`:'';throw Error(`Unknown ${kind} field --${raw}. Fields: ${e.fields.join(', ')}.${hint}`);}
  let v=value;if(v===true)throw Error(`--${raw} needs a value`);
  if(v==='null'){if(!NULLABLE.has(k))throw Error(`${k} cannot be cleared`);v=null;}
  else if(fk[k])v=await resolve(db,fk[k],v);
  else if(DATES.includes(k))v=dayDate(v);
  else if(BOOLS.includes(k))v=bool(v);
  else v=required(v,raw);
  vals[k]=v;
 }
 if(!Object.keys(vals).length)throw Error('Supply fields as --field=value');return vals;
}
async function write(db,cmd,kind,needle,v){
 const e=entities[kind];const cols=Object.keys(v);
 if(cmd==='add')return db.query(`insert into ${e.table} (${cols.join(',')}) values (${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(v));
 const id=typeof needle==='string'&&/^[0-9a-f-]{36}$/.test(needle)?needle:await resolve(db,kind,needle);
 return db.query(`update ${e.table} set ${cols.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${cols.length+1} returning *`,[...Object.values(v),id]);
}
async function tx(db,fn){await db.exec('BEGIN');try{const r=await fn();await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function mutate(db,cmd,kind,needle,opts){
 if(!entities[kind])throw Error(`Unknown record type ${kind}. Types: ${Object.keys(entities).join(', ')}`);
 if(cmd==='set')required(needle,kind);
 return tx(db,async()=>write(db,cmd,kind,needle,await values(db,kind,opts)));
}
function allowed(opts,keys){for(const k of Object.keys(opts))if(!['json',...keys].includes(k))throw Error(`Unknown option --${k}`);}
const today=async(db)=>(await db.query('select current_date::text d'))[0].d;
const nextRef=async(db,t,prefix)=>{const n=(await db.query(`select count(*)::int n from ${t}`))[0].n+1;let ref=prefix+String(n).padStart(2,'0');let i=n;while((await db.query(`select 1 from ${t} where ref=$1`,[ref])).length)ref=prefix+String(++i).padStart(2,'0');return ref;};
const getReport=async(db,needle)=>{const id=await resolve(db,'report',needle);return (await db.query('select * from reports where id=$1',[id]))[0];};
async function contact(db,r,direction,text,method,date){
 return write(db,'add','contact',null,{ref:await nextRef(db,'contacts','C-'),report_id:r.id,on_date:date?dayDate(date):await today(db),direction,method:method||'hotline',summary:required(text,'--text')});
}

// ------------------------------------------------------------ the case officer's rituals
async function assign(db,needle,opts){
 allowed(opts,['officer']);
 return tx(db,async()=>{const r=await getReport(db,needle);if(r.status==='closed')throw Error(`${r.ref} is closed`);
  const officer=await resolve(db,'person',required(opts.officer,'--officer'));
  return write(db,'set','report',r.id,{officer_id:officer,status:r.status==='received'?'assessing':r.status});});
}
async function acknowledge(db,needle,opts){
 allowed(opts,['date','method','text']);
 return tx(db,async()=>{const r=await getReport(db,needle);
  if(r.acknowledged_on)throw Error(`${r.ref} was acknowledged on ${r.acknowledged_on}`);
  if(r.anonymous&&!r.contact_route)throw Error(`${r.ref} has no contact route: there is no one to acknowledge. Record a route with set report ${r.ref} --contact-route="..." if the discloser makes contact.`);
  const date=opts.date?dayDate(opts.date):await today(db);
  await contact(db,r,'to_discloser',opts.text||'Acknowledged receipt, explained confidentiality and what happens next.',opts.method,date);
  return write(db,'set','report',r.id,{acknowledged_on:date});});
}
async function assess(db,needle,opts){
 allowed(opts,['protection','note','date']);const p=String(opts.protection||'').replace('-','_');
 if(!['protected','not_protected'].includes(p))throw Error('--protection must be protected or not-protected');
 return tx(db,async()=>{const r=await getReport(db,needle);if(r.status==='closed')throw Error(`${r.ref} is closed`);
  return write(db,'set','report',r.id,{protection:p,protection_note:required(opts.note,'--note'),assessed_on:opts.date?dayDate(opts.date):await today(db)});});
}
async function investigate(db,needle,opts){
 allowed(opts,['next-step','due']);
 return tx(db,async()=>{const r=await getReport(db,needle);if(r.status==='closed')throw Error(`${r.ref} is closed`);
  const v={status:'investigating'};if(opts['next-step'])v.next_step=required(opts['next-step'],'--next-step');if(opts.due)v.next_step_due=dayDate(opts.due);
  return write(db,'set','report',r.id,v);});
}
async function step(db,needle,opts){
 allowed(opts,['next-step','due']);
 return tx(db,async()=>{const r=await getReport(db,needle);if(r.status==='closed')throw Error(`${r.ref} is closed`);
  return write(db,'set','report',r.id,{next_step:required(opts['next-step'],'--next-step'),next_step_due:dayDate(required(opts.due,'--due'))});});
}
async function actionDone(db,needle,opts){
 allowed(opts,['result','date']);
 return tx(db,async()=>{const id=await resolve(db,'action',needle);const a=(await db.query('select * from actions where id=$1',[id]))[0];
  if(a.done_on)throw Error(`${a.ref} was done on ${a.done_on}`);
  return db.query('update actions set done_on=$1,result=$2 where id=$3 returning *',[opts.date?dayDate(opts.date):await today(db),required(opts.result,'--result'),id]);});
}
const FINDINGS=['substantiated','partly_substantiated','not_substantiated','no_action','referred'];
async function close(db,needle,opts){
 allowed(opts,['finding','outcome','date']);const f=String(opts.finding||'').trim().toLowerCase().replaceAll('-','_').replaceAll(' ','_');
 if(!FINDINGS.includes(f))throw Error(`--finding must be one of: ${FINDINGS.join(', ')}`);
 return tx(db,async()=>{const r=await getReport(db,needle);if(r.status==='closed')throw Error(`${r.ref} is already closed`);
  const open=await db.query('select ref from actions where report_id=$1 and done_on is null order by ref',[r.id]);
  if(open.length)throw Error(`${r.ref} still has open actions: ${open.map(x=>x.ref).join(', ')}. Finish them first.`);
  if(r.protection==='pending')throw Error(`${r.ref} has no protection assessment. Run assess first, so the file shows how the discloser was treated.`);
  const date=opts.date?dayDate(opts.date):await today(db);
  const res=await write(db,'set','report',r.id,{status:'closed',closed_on:date,finding:f,outcome:required(opts.outcome,'--outcome'),next_step:'',next_step_due:null});
  const checks=[];
  if(!(r.anonymous&&!r.contact_route))for(const k of ['retaliation_first_days','retaliation_second_days']){
   const due=(await db.query(`select ($1::date+setting($2))::text d`,[date,k]))[0].d;
   checks.push((await write(db,'add','check',null,{ref:await nextRef(db,'retaliation_checks','RC-'),report_id:r.id,due_on:due,note:''}))[0].ref);}
  return [{...res[0],retaliation_checks_scheduled:checks.join(', ')||'none (no way to reach the discloser)'}];});
}
async function toldOutcome(db,needle,opts){
 allowed(opts,['date','method','text']);
 return tx(db,async()=>{const r=await getReport(db,needle);if(r.status!=='closed')throw Error(`${r.ref} is not closed yet`);
  if(r.outcome_told_on)throw Error(`${r.ref}: outcome told on ${r.outcome_told_on}`);
  const date=opts.date?dayDate(opts.date):await today(db);
  await contact(db,r,'to_discloser',opts.text||'Told the outcome in general terms.',opts.method,date);
  return write(db,'set','report',r.id,{outcome_told_on:date});});
}
const BASES=['consent','regulator','police','lawyer','investigation_need','other'];
async function disclose(db,needle,opts){
 allowed(opts,['told','by','basis','note','date']);const b=String(opts.basis||'').trim().toLowerCase().replaceAll('-','_').replaceAll(' ','_');
 if(!BASES.includes(b))throw Error(`--basis must be one of: ${BASES.join(', ')}`);
 return tx(db,async()=>{const r=await getReport(db,needle);
  return write(db,'add','disclosure',null,{ref:await nextRef(db,'identity_disclosures','ID-'),report_id:r.id,on_date:opts.date?dayDate(opts.date):await today(db),
   told:required(opts.told,'--told'),told_by:await resolve(db,'person',required(opts.by,'--by')),basis:b,note:opts.note?String(opts.note).trim():''});});
}
async function checkDone(db,needle,opts){
 allowed(opts,['result','note','date']);const res=String(opts.result||'').trim().toLowerCase().replaceAll('-','_').replaceAll(' ','_');
 if(!['no_concern','concern','detriment'].includes(res))throw Error('--result must be no-concern, concern or detriment');
 return tx(db,async()=>{const id=await resolve(db,'check',needle);const k=(await db.query('select * from retaliation_checks where id=$1',[id]))[0];
  if(k.done_on)throw Error(`${k.ref} was done on ${k.done_on}`);
  return db.query('update retaliation_checks set done_on=$1,result=$2,note=$3 where id=$4 returning *',[opts.date?dayDate(opts.date):await today(db),res,res==='no_concern'?String(opts.note||''):required(opts.note,'--note'),id]);});
}
async function stamp(db,kind,col,needle,opts){allowed(opts,['date']);return tx(db,async()=>write(db,'set',kind,needle,{[col]:opts.date?dayDate(opts.date):await today(db)}));}

// ------------------------------------------------------------ import from NAVEX EthicsPoint
// EthicsPoint case lists are configured per customer, so column names vary. The importer reads a case list
// saved as CSV and matches the common names below; anything else maps with --mapping=map.json.
const COLS={ref:['Report Key','Report Number','Case Number','Case ID','Issue ID','Reference','Ref'],
 entity:['Organization','Organisation','Company','Entity','Legal Entity','Business Unit'],
 received:['Date Received','Received Date','Report Date','Date Reported','Created Date','Received'],
 channel:['Intake Method','Report Method','Source','Channel'],anonymous:['Anonymous','Is Anonymous','Reporter Anonymous'],
 category:['Primary Issue','Issue Type','Allegation Type','Category'],area:['Location','Site','Branch','Department'],
 summary:['Summary','Description','Allegation','Details'],severity:['Priority','Severity','Risk'],status:['Case Status','Status','Stage'],
 officer:['Case Manager','Case Owner','Assigned To','Investigator','Owner'],acknowledged:['Date Acknowledged','Acknowledged Date','Acknowledged'],
 closed:['Date Closed','Closed Date','Close Date'],finding:['Finding','Disposition','Substantiated','Outcome'],outcome:['Resolution','Action Taken','Closure Summary','Outcome Detail']};
const CATS=['fraud','corruption','safety','bullying','harassment','discrimination','privacy','financial_reporting','tax','regulatory','conflict_of_interest','retaliation','personal_grievance','other'];
const CAT_WORDS={theft:'fraud',embezzlement:'fraud','misuse of assets':'fraud','misuse of company assets':'fraud',bribery:'corruption',kickbacks:'corruption','gifts and entertainment':'conflict_of_interest',
 'health and safety':'safety','workplace safety':'safety','environment, health and safety':'safety','sexual harassment':'harassment','data privacy':'privacy','data protection':'privacy',
 'accounting and auditing':'financial_reporting',accounting:'financial_reporting','financial reporting':'financial_reporting','accounting irregularities':'financial_reporting',
 'conflict of interest':'conflict_of_interest',compliance:'regulatory','regulatory compliance':'regulatory','employee relations':'personal_grievance',hr:'personal_grievance','human resources':'personal_grievance',
 'tax evasion':'tax',victimisation:'retaliation',victimization:'retaliation'};
function mapCategory(s,warn,ref){s=String(s||'').trim().toLowerCase();if(!s)return 'other';const u=s.replaceAll(' ','_');if(CATS.includes(u))return u;if(CAT_WORDS[s])return CAT_WORDS[s];warn.push(`${ref}: issue type "${s}" imported as other. Add it to CAT_WORDS or fix the record.`);return 'other';}
function mapSeverity(s){s=String(s||'').trim().toLowerCase();if(!s)return 'medium';if(['low','medium','high'].includes(s))return s;if(['critical','urgent','1','p1'].includes(s))return 'high';if(['moderate','normal','2','p2'].includes(s))return 'medium';return 'low';}
function mapChannel(s){s=String(s||'').trim().toLowerCase();if(!s)return 'hotline';if(/phone|call|hotline/.test(s))return 'hotline';if(/web|online|portal|internet/.test(s))return 'web';if(/mail|e-mail/.test(s))return 'email';if(/letter|post/.test(s))return 'letter';if(/person|walk|open door|manager/.test(s))return 'in_person';return 'hotline';}
function mapFinding(s){s=String(s||'').trim().toLowerCase();if(!s)return null;if(/partial|partly/.test(s))return 'partly_substantiated';if(/^(un|not|non)[- ]?substantiated|unfounded|not supported/.test(s))return 'not_substantiated';if(/substantiated|founded|supported/.test(s))return 'substantiated';if(/refer/.test(s))return 'referred';if(/no action|insufficient|closed/.test(s))return 'no_action';return null;}
function mapStatus(s){s=String(s||'').trim().toLowerCase();if(!s||['new','open','received','submitted'].includes(s))return 'received';if(/closed|resolved|complete/.test(s))return 'closed';if(/investigat|in progress|active/.test(s))return 'investigating';if(/assess|triage|review|pending/.test(s))return 'assessing';throw Error(`Unknown status "${s}"`);}
function flexDate(v,label){v=String(v||'').trim();if(!v)return null;const m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return dayDate(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);try{return dayDate(v.slice(0,10));}catch{throw Error(`${label}: unreadable date "${v}" (use YYYY-MM-DD or DD/MM/YYYY)`);}}
async function entityFor(db,name,jurisdiction,created){
 const n=required(name,'entity');const rows=await db.query('select id from entities where lower(name)=lower($1) or lower(ref)=lower($1)',[n]);if(rows.length)return rows[0].id;
 const ref='E-'+n.toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,12);
 const r=await db.query('insert into entities(ref,name,jurisdiction) values($1,$2,$3) on conflict(ref) do update set name=entities.name returning id',[ref,n,jurisdiction]);created.add(n);return r[0].id;
}
async function importEthicsPoint(db,opts){
 allowed(opts,['file','mapping','dry-run','jurisdiction']);const jur=String(opts.jurisdiction||'NZ').toUpperCase();if(!['NZ','AU'].includes(jur))throw Error('--jurisdiction must be NZ or AU');
 const rows=parseCsv(fs.readFileSync(required(opts.file,'--file'),'utf8'));if(!rows.length)throw Error('CSV has no data rows');
 const mapping=opts.mapping?JSON.parse(fs.readFileSync(opts.mapping,'utf8')):{};
 if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Mapping must be a JSON object');
 for(const [k,v] of Object.entries(mapping))if(!COLS[k]||typeof v!=='string'||!Object.keys(rows[0]).includes(v))throw Error(`Mapping "${k}" must name a column in this file`);
 const val=(r,k)=>mapping[k]?r[mapping[k]]:pick(r,...COLS[k]);
 const out=[],created=new Set(),warnings=[];
 await db.exec('BEGIN');try{
 for(const [i,r] of rows.entries()){try{
  const ref=required(val(r,'ref'),'case reference');
  const officer=val(r,'officer')?await resolve(db,'person',val(r,'officer')):null;
  let status=mapStatus(val(r,'status'));const finding=mapFinding(val(r,'finding'));const outcome=String(val(r,'outcome')||'').trim();
  const received=flexDate(val(r,'received'),'received')||await today(db);const closed=flexDate(val(r,'closed'),'closed');const ack=flexDate(val(r,'acknowledged'),'acknowledged');
  const anon=yesNo(val(r,'anonymous'),true);
  if(status==='closed'&&!(finding&&outcome&&closed)){status='assessing';warnings.push(`${ref}: closed in EthicsPoint without a finding, outcome and close date here. Imported open; close it with close ${ref} --finding=... --outcome="..."`);}
  if(status==='investigating'&&!ack){status='assessing';warnings.push(`${ref}: no acknowledgement date in the file. Imported as assessing; record it with acknowledge ${ref} --date=YYYY-MM-DD`);}
  if(status!=='received'&&!officer){status='received';warnings.push(`${ref}: no case manager matched. Imported as received; assign it with assign ${ref} --officer=...`);}
  const vals={ref,entity_id:await entityFor(db,val(r,'entity')||'Imported',jur,created),received_on:received,channel:mapChannel(val(r,'channel')),anonymous:anon,
   alias:anon?'':'Named in EthicsPoint',contact_route:'Through the EthicsPoint report key until the line is moved',category:mapCategory(val(r,'category'),warnings,ref),area:String(val(r,'area')||'').trim(),
   summary:String(val(r,'summary')||'').trim()||'(no summary in the export)',severity:mapSeverity(val(r,'severity')),status,officer_id:officer,acknowledged_on:ack,
   protection:status==='closed'?'not_protected':'pending',protection_note:status==='closed'?'Imported closed from EthicsPoint; protection assessed there.':'',assessed_on:status==='closed'?closed:null,
   closed_on:status==='closed'?closed:null,finding:status==='closed'?finding:null,outcome:status==='closed'?outcome:''};
  const cols=Object.keys(vals);const upd=cols.filter(c=>c!=='ref').map(c=>`${c}=excluded.${c}`).join(',');
  const res=await db.query(`insert into reports(${cols.join(',')}) values(${cols.map((_,j)=>'$'+(j+1)).join(',')}) on conflict(ref) do update set ${upd} returning ref,(xmax=0) inserted`,Object.values(vals));
  out.push({row:i+2,ref:res[0].ref,status,action:res[0].inserted?'added':'updated'});
 }catch(e){throw Error(`CSV row ${i+2}: ${e.message}`);}}
 if(created.size)warnings.push(`New entities (${jur}, kind private; set the right kind): ${[...created].join(', ')}`);
 await db.exec(opts['dry-run']?'ROLLBACK':'COMMIT');return {dry_run:Boolean(opts['dry-run']),rows:out.length,warnings,records:out};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
const csvCell=v=>`"${String(v??'').replaceAll('"','""')}"`;
async function exportAll(db,opts){
 allowed(opts,['out']);const dir=path.resolve(opts.out||path.join(REPO_ROOT,'exports',new Date().toISOString().replace(/[:.]/g,'-')));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});const snapshot={format:'whistleblowing-v1',exported_at:new Date().toISOString(),tables:{}};
 await db.exec('BEGIN READ ONLY');try{
 for(const t of [...Object.values(entities).map(e=>e.table),'settings','holidays','audit_events']){
  const rows=await db.query(`select * from ${t} order by ${t==='settings'?'key':t==='holidays'?'on_date':'id'}`);snapshot.tables[t]=rows;
  if(rows.length){const keys=Object.keys(rows[0]);const data=[keys.map(csvCell).join(','),...rows.map(r=>keys.map(k=>csvCell(typeof r[k]==='object'&&r[k]!==null?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n')+'\r\n';fs.writeFileSync(path.join(dir,t+'.csv'),data,{mode:0o600,flag:'wx'});}
 }
 fs.writeFileSync(path.join(dir,'snapshot.json'),JSON.stringify(snapshot,null,2)+'\n',{mode:0o600,flag:'wx'});
 await db.exec('ROLLBACK');return {directory:dir,counts:Object.fromEntries(Object.entries(snapshot.tables).map(([k,v])=>[k,v.length]))};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}

// ------------------------------------------------------------ reviews and drafts
async function caseFile(db,needle){
 const r=await getReport(db,needle);
 return {report:(await db.query('select ref,entity,jurisdiction,received_on,channel,anonymous,alias,relationship,category,area,severity,status,officer,acknowledged_on,ack_due,protection,regulator_told_on,next_step,next_step_due,closed_on,finding,outcome_told_on,days_open,last_update_on from v_reports where id=$1',[r.id]))[0],
  summary:r.summary,protection_note:r.protection_note,outcome:r.outcome,
  contacts:await db.query('select ref,on_date,direction,method,summary from contacts where report_id=$1 order by on_date,ref',[r.id]),
  actions:await db.query('select ref,owner,description,due_on,done_on,result from v_actions where report=$1 order by due_on',[r.ref]),
  identity:await db.query('select ref,on_date,told,told_by,basis,note from v_identity where report=$1 order by on_date',[r.ref]),
  retaliation_checks:await db.query('select ref,due_on,done_on,result,note from v_retaliation where report=$1 order by due_on',[r.ref]),
  notes:await db.query('select ref,created_at::date on_date,body from notes where report_id=$1 order by created_at',[r.id])};
}
async function weeklyReview(db){return {attention:await db.query(reads.attention),open_cases:await db.query(reads.reports),workload:await db.query(reads.workload)};}
// The board sees numbers, categories and dates. Never a summary, an alias or a contact route.
async function boardReport(db){
 return {entities:await db.query('select name,jurisdiction,reports_12m,anonymous_12m,open_cases,substantiated_12m,policy_review_due from v_entities order by ref'),
  trends:await db.query(reads.trends),
  open_cases:await db.query(`select ref,entity,category,severity,status,days_open,protection from v_reports where ${OPEN} order by days_open desc`),
  closed_12m:await db.query("select ref,entity,category,finding,days_open days_to_close from v_reports where status='closed' and closed_on>=current_date-365 order by closed_on desc"),
  compliance:await db.query('select ref,rule,issue from v_compliance order by rule,ref')};
}
function draft(name,title,subtitle,sections){return {file:writeOut('drafts',`${name}-${Date.now()}`,page({title,subtitle,sections}))};}
function rowsHtml(obj){return Object.entries(obj).map(([k,v])=>({title:k.replaceAll('_',' '),html:Array.isArray(v)?htmlTable(v):`<p>${esc(v)}</p>`}));}
async function letterTo(db,needle,kind){
 const f=await caseFile(db,needle);const r=f.report;
 if(r.anonymous&&!(await getReport(db,r.ref)).contact_route)throw Error(`${r.ref} has no contact route: there is no one to write to`);
 const greet=`<p>To ${esc(r.alias)}</p><p>Our reference: ${esc(r.ref)}</p>`;
 const sign=`<p>${esc(r.officer||'The speak-up team')}, case officer</p>`;
 if(kind==='ack'){
  if(!r.officer)throw Error(`${r.ref} has no case officer. Assign one first.`);
  return [{title:'Message',html:`${greet}<p>Thank you for raising this with us. We received your report on ${esc(r.received_on)} and it is now with ${esc(r.officer)}, who handles it in confidence.</p>
<p>We will not tell anyone who you are unless you agree, or the law allows it (for example, to a regulator or our lawyers). If you think you are being treated badly because you spoke up, tell us straight away.</p>
<p>${r.jurisdiction==='NZ'?`We will tell you what we are doing about it by ${esc(r.ack_due)}.`:'We will update you on what we are doing about it as the matter progresses.'} You can reach us the same way you reached us before.</p>${sign}`}];}
 if(kind==='update'){
  if(r.status==='closed')throw Error(`${r.ref} is closed. Use draft-outcome.`);
  return [{title:'Message',html:`${greet}<p>An update on the matter you raised on ${esc(r.received_on)}.</p><p>Where it is up to: ${esc(r.status==='investigating'?'we are investigating':'we are assessing what you told us')}.${r.next_step?` The next step is: ${esc(r.next_step)}${r.next_step_due?`, which we expect by ${esc(r.next_step_due)}`:''}.`:''}</p>
<p>Edit the line above before sending: never name a witness, the person the report is about, or anything that could identify you to others.</p><p>If you have more information, or anything has changed for you at work since you spoke up, please tell us.</p>${sign}`}];}
 if(r.status!=='closed')throw Error(`${r.ref} is not closed yet`);
 const words={substantiated:'we found that what you reported happened, and we have acted on it',partly_substantiated:'we found that part of what you reported happened, and we have acted on that part',
  not_substantiated:'we did not find evidence that what you reported happened',no_action:'we decided no further action was needed',referred:'we referred the matter to the right team or body to deal with'}[r.finding];
 return [{title:'Message',html:`${greet}<p>We have finished looking into the matter you raised on ${esc(r.received_on)}. In short, ${esc(words)}.</p>
<p>We cannot share every detail, because others involved are also owed confidentiality. Outcome recorded on the file: ${esc(f.outcome)}. Edit this line to what you can share before sending.</p>
<p>Thank you for speaking up. If anything changes for you at work because of this, tell us. We will check in with you over the coming months.</p>${sign}`}];
}

const usage=`Whistleblowing CLI

Reads: ${Object.keys(reads).join(', ')}
card <type> <ref-or-name>     case <report>  (the whole file)
add <type> --ref=... --field=value     set <type> <ref-or-name> --field=value
Types: ${Object.keys(entities).join(', ')}
assign <report> --officer=<person>
acknowledge <report> [--date=] [--method=] [--text=]
assess <report> --protection=protected|not-protected --note="..." [--date=]
investigate <report> [--next-step="..."] [--due=]
step <report> --next-step="..." --due=YYYY-MM-DD
update <report> --text="..." [--method=] [--date=]      (to the discloser)
heard <report> --text="..." [--method=] [--date=]       (from the discloser)
done <action> --result="..." [--date=]
close <report> --finding=substantiated|partly-substantiated|not-substantiated|no-action|referred --outcome="..." [--date=]
told-outcome <report> [--date=] [--text=]
disclose <report> --told="who" --by=<person> --basis=consent|regulator|police|lawyer|investigation-need|other [--note=] [--date=]
check <retaliation-check> --result=no-concern|concern|detriment [--note=] [--date=]
log <report> --text="..."
trained <person> [--date=]      policy <entity> [--date=]      holiday <YYYY-MM-DD> --name="..."
weekly-review | board-report
draft-weekly-review | draft-board-report | draft-acknowledgement <report> | draft-update <report> | draft-outcome <report> | draft-case-file <report>
import ethicspoint --file=cases.csv [--jurisdiction=NZ|AU] [--mapping=map.json] [--dry-run]
export [--out=folder]
Every command accepts --json. Dates YYYY-MM-DD.`;
export async function execute(db,args){
 const {pos,opts}=parse(args);const [cmd,kind,needle]=pos;
 if(cmd==='help'||!cmd)return {help:usage};
 if(reads[cmd]){allowed(opts,[]);if(pos.length>1)throw Error('Read commands take no filters. Ask Claude to filter the result.');return db.query(reads[cmd]);}
 if(cmd==='add'||cmd==='set')return mutate(db,cmd,kind,needle,opts);
 if(cmd==='card'){allowed(opts,[]);const id=await resolve(db,kind,needle);return db.query(`select * from ${entities[kind].table} where id=$1`,[id]);}
 if(cmd==='case'){allowed(opts,[]);return caseFile(db,kind);}
 if(cmd==='assign')return assign(db,kind,opts);
 if(cmd==='acknowledge')return acknowledge(db,kind,opts);
 if(cmd==='assess')return assess(db,kind,opts);
 if(cmd==='investigate')return investigate(db,kind,opts);
 if(cmd==='step')return step(db,kind,opts);
 if(cmd==='update'||cmd==='heard'){allowed(opts,['text','method','date']);return tx(db,async()=>contact(db,await getReport(db,kind),cmd==='update'?'to_discloser':'from_discloser',opts.text,opts.method,opts.date));}
 if(cmd==='done')return actionDone(db,kind,opts);
 if(cmd==='close')return close(db,kind,opts);
 if(cmd==='told-outcome')return toldOutcome(db,kind,opts);
 if(cmd==='disclose')return disclose(db,kind,opts);
 if(cmd==='check')return checkDone(db,kind,opts);
 if(cmd==='trained')return stamp(db,'person','trained_on',kind,opts);
 if(cmd==='policy')return stamp(db,'entity','policy_on',kind,opts);
 if(cmd==='holiday'){allowed(opts,['name']);return db.query('insert into holidays(on_date,name) values($1,$2) on conflict(on_date) do update set name=excluded.name returning *',[dayDate(required(kind,'date')),required(opts.name,'--name')]);}
 if(cmd==='log'){allowed(opts,['text']);return tx(db,async()=>write(db,'add','note',null,{ref:await nextRef(db,'notes','N-'),report_id:await resolve(db,'report',required(kind,'report')),body:required(opts.text,'--text')}));}
 if(cmd==='import'){if(kind!=='ethicspoint')throw Error('Supported import: ethicspoint (a case list saved as CSV)');return importEthicsPoint(db,opts);}
 if(cmd==='export')return exportAll(db,opts);
 if(cmd==='weekly-review'){allowed(opts,[]);return weeklyReview(db);}
 if(cmd==='draft-weekly-review'){allowed(opts,[]);return draft('weekly-review','DRAFT weekly speak-up review','For case officers only. Confidential. Nothing sent.',rowsHtml(await weeklyReview(db)));}
 if(cmd==='board-report'){allowed(opts,[]);return boardReport(db);}
 if(cmd==='draft-board-report'){allowed(opts,[]);return draft('board-report','DRAFT speak-up report to the board','Numbers and categories only: no summaries, aliases or contact routes. Review before circulating.',rowsHtml(await boardReport(db)));}
 if(cmd==='draft-acknowledgement'){allowed(opts,[]);const s=await letterTo(db,kind,'ack');return draft(`acknowledgement-${kind}`,'DRAFT acknowledgement to the discloser','Send through the discloser\'s own contact route. Nothing sent.',s);}
 if(cmd==='draft-update'){allowed(opts,[]);const s=await letterTo(db,kind,'update');return draft(`update-${kind}`,'DRAFT update to the discloser','Send through the discloser\'s own contact route. Nothing sent.',s);}
 if(cmd==='draft-outcome'){allowed(opts,[]);const s=await letterTo(db,kind,'outcome');return draft(`outcome-${kind}`,'DRAFT outcome message to the discloser','Check what can be shared before sending. Nothing sent.',s);}
 if(cmd==='draft-case-file'){allowed(opts,[]);const f=await caseFile(db,kind);return draft(`case-file-${f.report.ref}`,`DRAFT case file ${f.report.ref}`,'Confidential. For the case officer and anyone the file is lawfully shared with.',rowsHtml(f));}
 throw Error(`Unknown command ${cmd}. Run help.`);
}
function fmt(rows){return rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString().slice(0,16).replace('T',' '):v])));}
function human(result){if(Array.isArray(result)){if(!result.length)return '(none)';const rows=fmt(result);return table(rows,Object.keys(rows[0]).filter(k=>k!=='id'&&k!=='before_row'&&k!=='after_row').map(key=>({key,label:key.replaceAll('_',' '),width:60})));}if(result.help)return result.help;
 return Object.entries(result).map(([k,v])=>`${k.replaceAll('_',' ')}\n${Array.isArray(v)?human(v):v&&typeof v==='object'?human([v]):v}`).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{const args=process.argv.slice(2);db=await getDb();const result=await execute(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):human(result));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
