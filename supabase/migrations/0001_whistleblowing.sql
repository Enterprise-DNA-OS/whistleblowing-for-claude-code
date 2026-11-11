-- Whistleblowing for Claude Code: the records a speak-up programme runs on.
-- Portable Postgres (PGlite and any hosted Postgres). No extensions.
-- Identity rule: the database never stores a discloser's name. A report holds an alias and a
-- contact route (a hotline PIN, a mailbox, a phone number the discloser chose). Who has been
-- told the identity, and on what basis, lives in identity_disclosures.
create table settings (key text primary key, value integer not null check(value>=0), note text not null default '');
insert into settings values
 ('ack_working_days',20,'NZ Protected Disclosures Act s13: acknowledge, consider, deal with and inform within 20 working days'),
 ('ack_days_au',7,'Office policy: calendar days to acknowledge an Australian report (no statutory deadline)'),
 ('triage_days',2,'Office policy: days a new report may wait before a case officer is assigned'),
 ('update_days',30,'Office policy: days between updates to a discloser on an open case'),
 ('quiet_days',21,'Office policy: an open case with no note or contact for this many days is flagged as quiet'),
 ('target_close_days',90,'Office policy: days from receipt by which a case should normally close'),
 ('public_interest_watch_days',75,'Watch window before the 90-day point after a discloser told ASIC or APRA (s1317AAD)'),
 ('policy_review_months',24,'Office policy: months between reviews of each entity''s whistleblower policy or procedures'),
 ('training_months',24,'Office policy: months between training for eligible recipients and case officers'),
 ('retaliation_first_days',30,'Office policy: first retaliation check, days after a case closes'),
 ('retaliation_second_days',90,'Office policy: second retaliation check, days after a case closes'),
 ('max_open_cases',5,'Office policy: open cases one officer can hold before the workload flag');

create table holidays (on_date date primary key, name text not null);

create table entities (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 jurisdiction text not null check(jurisdiction in ('NZ','AU')),
 kind text not null default 'private' check(kind in ('private','public_sector','public_company','large_proprietary','small_proprietary','super_trustee','not_for_profit')),
 policy_on date, policy_location text not null default '', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table people (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 role text not null check(role in ('officer','recipient','investigator','board')),
 title text not null default '', email text not null default '', entity_id uuid references entities,
 trained_on date, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table reports (
 id uuid primary key default gen_random_uuid(), ref text unique not null,
 entity_id uuid not null references entities, received_on date not null default current_date,
 channel text not null default 'email' check(channel in ('hotline','web','email','phone','in_person','letter','manager','regulator_referral')),
 received_by uuid references people,
 anonymous boolean not null default true, alias text not null default '', contact_route text not null default '',
 relationship text not null default 'unknown' check(relationship in ('employee','former_employee','contractor','supplier','officer','relative','volunteer','other','unknown')),
 category text not null default 'other' check(category in ('fraud','corruption','safety','bullying','harassment','discrimination','privacy','financial_reporting','tax','regulatory','conflict_of_interest','retaliation','personal_grievance','other')),
 area text not null default '', summary text not null,
 severity text not null default 'medium' check(severity in ('low','medium','high')),
 status text not null default 'received' check(status in ('received','assessing','investigating','closed')),
 officer_id uuid references people, acknowledged_on date,
 protection text not null default 'pending' check(protection in ('pending','protected','not_protected')), protection_note text not null default '',
 assessed_on date, regulator_told_on date,
 next_step text not null default '', next_step_due date,
 closed_on date, finding text check(finding in ('substantiated','partly_substantiated','not_substantiated','no_action','referred')),
 outcome text not null default '', outcome_told_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'closed' or (closed_on is not null and finding is not null and length(trim(outcome))>0)),
 check(closed_on is null or closed_on>=received_on),
 check(acknowledged_on is null or acknowledged_on>=received_on),
 check(protection='pending' or (assessed_on is not null and length(trim(protection_note))>0)),
 check(anonymous or length(trim(contact_route))>0));

create table contacts (
 id uuid primary key default gen_random_uuid(), ref text unique not null, report_id uuid not null references reports,
 on_date date not null default current_date, direction text not null check(direction in ('to_discloser','from_discloser')),
 method text not null default 'hotline', summary text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table actions (
 id uuid primary key default gen_random_uuid(), ref text unique not null, report_id uuid not null references reports,
 description text not null, owner_id uuid not null references people, due_on date not null, done_on date, result text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(done_on is null or length(trim(result))>0));

create table identity_disclosures (
 id uuid primary key default gen_random_uuid(), ref text unique not null, report_id uuid not null references reports,
 on_date date not null default current_date, told text not null, told_by uuid not null references people,
 basis text not null check(basis in ('consent','regulator','police','lawyer','investigation_need','other')),
 note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(basis<>'other' or length(trim(note))>0));

create table retaliation_checks (
 id uuid primary key default gen_random_uuid(), ref text unique not null, report_id uuid not null references reports,
 due_on date not null, done_on date, result text check(result in ('no_concern','concern','detriment')), note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((done_on is null and result is null) or (done_on is not null and result is not null)),
 check(result is null or result='no_concern' or length(trim(note))>0));

create table notes (
 id uuid primary key default gen_random_uuid(), ref text unique not null, report_id uuid not null references reports,
 body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table audit_events (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null,
 action text not null, before_row jsonb, after_row jsonb, actor text not null default current_user,
 created_at timestamptz not null default now());

create function stamp_update() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create function audit_change() returns trigger language plpgsql as $$ begin
 insert into audit_events(entity,record_id,action,before_row,after_row) values(TG_TABLE_NAME,new.id,TG_OP,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;end $$;
create function validate_report() returns trigger language plpgsql as $$ begin
 if new.officer_id is not null and not exists(select 1 from people where id=new.officer_id and role='officer' and active) then raise exception 'Case officer must be an active person with the officer role';end if;
 if new.status in ('assessing','investigating','closed') and new.officer_id is null then raise exception 'A case past received needs a case officer';end if;
 if new.status in ('investigating','closed') and new.acknowledged_on is null and not (new.anonymous and new.contact_route='') then raise exception 'Acknowledge the discloser before investigating or closing';end if;
 if new.anonymous and length(trim(new.alias))=0 then new.alias:='Discloser '||new.ref;end if;
 return new;end $$;
create trigger report_rules before insert or update on reports for each row execute function validate_report();
create function validate_action_owner() returns trigger language plpgsql as $$ begin
 if not exists(select 1 from people where id=new.owner_id and role in ('officer','investigator') and active) then raise exception 'Actions are owned by a case officer or investigator';end if;return new;end $$;
create trigger action_owner before insert or update on actions for each row execute function validate_action_owner();
create function validate_told_by() returns trigger language plpgsql as $$ begin
 if not exists(select 1 from people where id=new.told_by and role in ('officer','recipient','investigator')) then raise exception 'Identity disclosures are recorded against an officer, recipient or investigator';end if;return new;end $$;
create trigger identity_told_by before insert or update on identity_disclosures for each row execute function validate_told_by();
create function block_delete() returns trigger language plpgsql as $$ begin raise exception 'Case records are never deleted. Close the case or correct the record instead.';end $$;
do $$ declare t text;begin
 foreach t in array array['entities','people','reports','contacts','actions','identity_disclosures','retaliation_checks','notes'] loop
 execute format('create trigger updated before update on %I for each row execute function stamp_update()',t);
 execute format('create trigger audit after insert or update on %I for each row execute function audit_change()',t);
 execute format('alter table %I enable row level security',t); execute format('revoke all on %I from public',t);
 end loop;
 foreach t in array array['reports','contacts','actions','identity_disclosures','retaliation_checks','notes','audit_events'] loop
 execute format('create trigger no_delete before delete on %I for each row execute function block_delete()',t);
 end loop;end $$;
alter table settings enable row level security; alter table audit_events enable row level security; alter table holidays enable row level security;
revoke all on settings,audit_events,holidays from public;
create function setting(k text) returns integer language sql stable as $$ select value from settings where key=k $$;
-- Working days: Monday to Friday, less the dates in the holidays table.
create function add_working_days(d date,n integer) returns date language sql stable as $$
 select x::date from generate_series(d+1,d+n*3+40,interval '1 day') x
 where extract(isodow from x)<6 and not exists(select 1 from holidays h where h.on_date=x::date)
 order by x offset n-1 limit 1 $$;
create function working_days_between(a date,b date) returns integer language sql stable as $$
 select case when b<=a then 0 else (select count(*)::int from generate_series(a+1,b,interval '1 day') x
 where extract(isodow from x)<6 and not exists(select 1 from holidays h where h.on_date=x::date)) end $$;

create view v_reports as
 select r.id,r.ref,e.name entity,e.jurisdiction,r.received_on,r.channel,r.anonymous,r.alias,r.relationship,r.category,r.area,r.severity,r.status,
 o.name officer,r.acknowledged_on,
 case when e.jurisdiction='NZ' then add_working_days(r.received_on,setting('ack_working_days')) else r.received_on+setting('ack_days_au') end ack_due,
 r.protection,r.regulator_told_on,r.next_step,r.next_step_due,r.closed_on,r.finding,r.outcome_told_on,
 coalesce(r.closed_on,current_date)-r.received_on days_open,
 (select max(c.on_date) from contacts c where c.report_id=r.id and c.direction='to_discloser') last_update_on,
 greatest((select max(c.on_date) from contacts c where c.report_id=r.id),(select max(n.created_at)::date from notes n where n.report_id=r.id)) last_activity_on,
 (r.anonymous and r.contact_route='') no_contact_route
 from reports r join entities e on e.id=r.entity_id left join people o on o.id=r.officer_id;

create view v_actions as
 select a.id,a.ref,r.ref report,p.name owner,a.description,a.due_on,a.done_on,a.result,a.due_on-current_date days_left
 from actions a join reports r on r.id=a.report_id join people p on p.id=a.owner_id;

create view v_identity as
 select i.id,i.ref,r.ref report,i.on_date,i.told,p.name told_by,i.basis,i.note
 from identity_disclosures i join reports r on r.id=i.report_id join people p on p.id=i.told_by;

create view v_retaliation as
 select k.id,k.ref,r.ref report,r.status report_status,o.name officer,k.due_on,k.done_on,k.result,k.note,k.due_on-current_date days_left
 from retaliation_checks k join reports r on r.id=k.report_id left join people o on o.id=r.officer_id;

create view v_workload as
 select p.ref,p.name,
 count(r.id) filter(where r.status<>'closed') open_cases,
 count(r.id) filter(where r.status<>'closed' and r.severity='high') high_severity,
 (select count(*) from actions a where a.owner_id=p.id and a.done_on is null and a.due_on<current_date) overdue_actions,
 round(avg(r.closed_on-r.received_on) filter(where r.status='closed'),1) avg_days_to_close
 from people p left join reports r on r.officer_id=p.id where p.role='officer' and p.active group by p.id;

create view v_entities as
 select e.ref,e.name,e.jurisdiction,e.kind,e.policy_on,
 (e.policy_on+make_interval(months=>setting('policy_review_months')))::date policy_review_due,
 (select count(*) from reports r where r.entity_id=e.id and r.received_on>=current_date-365) reports_12m,
 (select count(*) from reports r where r.entity_id=e.id and r.status<>'closed') open_cases,
 (select count(*) from reports r where r.entity_id=e.id and r.anonymous and r.received_on>=current_date-365) anonymous_12m,
 (select count(*) from reports r where r.entity_id=e.id and r.finding in ('substantiated','partly_substantiated') and r.closed_on>=current_date-365) substantiated_12m
 from entities e where e.active;

create view v_trends as
 select to_char(date_trunc('quarter',r.received_on),'YYYY-"Q"Q') quarter,r.category,count(*) reports,
 count(*) filter(where r.anonymous) anonymous,
 count(*) filter(where r.finding in ('substantiated','partly_substantiated')) substantiated,
 round(avg(r.closed_on-r.received_on) filter(where r.closed_on is not null),1) avg_days_to_close
 from reports r where r.received_on>=date_trunc('quarter',current_date)-interval '1 year' group by 1,2;

create view v_compliance as
 select r.ref,r.entity subject,'ACKNOWLEDGE' rule,
 'Received '||r.received_on||', not acknowledged; due '||r.ack_due||case when r.ack_due<current_date then ' (overdue)' else '' end issue,
 case when r.jurisdiction='NZ' then 'https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/protected-disclosures-information' else 'Office policy (docs/compliance.md)' end source
 from v_reports r where r.status<>'closed' and r.acknowledged_on is null and not r.no_contact_route and r.ack_due<=current_date+5
 union all
 select r.ref,r.entity,'NZ-20-WORKING-DAYS','Received '||r.received_on||', '||working_days_between(r.received_on,current_date)||' working days ago; no update to the discloser on what is being done',
 'https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/protected-disclosures-information'
 from v_reports r where r.jurisdiction='NZ' and r.status<>'closed' and not r.no_contact_route and r.ack_due<current_date and r.acknowledged_on is not null
 and not exists(select 1 from contacts c where c.report_id=r.id and c.direction='to_discloser' and c.on_date>r.acknowledged_on)
 union all
 select r.ref,r.entity,'IDENTITY',i.told||' told the discloser''s identity on '||i.on_date||' (basis: other): '||i.note,
 case when r.jurisdiction='NZ' then 'https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/protected-disclosures-information' else 'https://www.asic.gov.au/about-asic/asic-investigations-and-enforcement/whistleblowing/protections-for-corporate-sector-whistleblowers' end
 from identity_disclosures i join v_reports r on r.id=i.report_id where i.basis='other'
 union all
 select e.ref,e.name,'POLICY',
 case when e.policy_on is null then 'No whistleblower policy recorded' else 'Policy last reviewed '||e.policy_on||', review due '||e.policy_review_due end,
 case when x.jurisdiction='AU' then 'https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-270-whistleblower-policies' else 'https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/protected-disclosures-information' end
 from v_entities e join entities x on x.ref=e.ref
 where ((x.jurisdiction='AU' and x.kind in ('public_company','large_proprietary','super_trustee')) or (x.jurisdiction='NZ' and x.kind='public_sector'))
 and (e.policy_on is null or e.policy_review_due<current_date+30)
 union all
 select r.ref,r.entity,'PUBLIC-INTEREST','Discloser told ASIC or APRA on '||r.regulator_told_on||'; the 90-day point is '||(r.regulator_told_on+90)||' and the case is still open',
 'https://www.asic.gov.au/about-asic/asic-investigations-and-enforcement/whistleblowing/protections-for-corporate-sector-whistleblowers'
 from v_reports r where r.jurisdiction='AU' and r.status<>'closed' and r.regulator_told_on is not null and r.regulator_told_on+setting('public_interest_watch_days')<=current_date
 union all
 select k.report,r.entity,'RETALIATION',case when k.result='detriment' then 'Detriment found on '||k.done_on||': '||k.note else 'Check due '||k.due_on||' not done' end,
 case when r.jurisdiction='NZ' then 'https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/make-protected-disclosure' else 'https://www.asic.gov.au/about-asic/asic-investigations-and-enforcement/whistleblowing/protections-for-corporate-sector-whistleblowers' end
 from v_retaliation k join v_reports r on r.ref=k.report where (k.done_on is null and k.due_on<current_date) or (k.result='detriment' and r.status<>'closed');

create view v_attention as
 select 1 priority,ref,'Compliance' category,subject||' '||rule||': '||issue detail from v_compliance
 union all select 1,ref,'Unassigned',category||' report from '||entity||', received '||received_on||' ('||days_open||' days)' from v_reports where status<>'closed' and officer is null and days_open>=setting('triage_days')
 union all select 1,ref,'High severity, no next step',category||' at '||entity||' ('||coalesce(officer,'no officer')||')' from v_reports where status<>'closed' and severity='high' and (next_step='' or next_step_due is null)
 union all select 2,ref,'Overdue action',report||': '||description||' ('||owner||') was due '||due_on from v_actions where done_on is null and due_on<current_date
 union all select 2,ref,'Overdue step',category||' at '||entity||': '||next_step||' was due '||next_step_due from v_reports where status<>'closed' and next_step_due<current_date
 union all select 2,ref,'Discloser not updated',alias||': last update '||coalesce(last_update_on::text,'never')||' ('||days_open||' days open)' from v_reports
  where status<>'closed' and not no_contact_route and acknowledged_on is not null and coalesce(last_update_on,acknowledged_on)<current_date-setting('update_days')
 union all select 2,ref,'Outcome not told',alias||': closed '||closed_on||' ('||finding||'), discloser not told the outcome' from v_reports where status='closed' and outcome_told_on is null and not no_contact_route
 union all select 2,ref,'Protection not assessed',category||' at '||entity||', received '||received_on from v_reports where status<>'closed' and protection='pending' and days_open>14
 union all select 2,ref,'Workload',name||' holds '||open_cases||' open cases' from v_workload where open_cases>setting('max_open_cases')
 union all select 3,ref,'Quiet case',category||' at '||entity||': last activity '||coalesce(last_activity_on::text,'never') from v_reports where status<>'closed' and coalesce(last_activity_on,received_on)<current_date-setting('quiet_days')
 union all select 3,ref,'Past target',category||' at '||entity||' open '||days_open||' days' from v_reports where status<>'closed' and days_open>setting('target_close_days')
 union all select 3,ref,'Training',name||' ('||role||') last trained '||coalesce(trained_on::text,'never') from people where active and role in ('officer','recipient') and (trained_on is null or trained_on<(current_date-make_interval(months=>setting('training_months')))::date)
 union all select 3,ref,'Retaliation check due',report||': check due '||due_on from v_retaliation where done_on is null and due_on between current_date and current_date+14;
