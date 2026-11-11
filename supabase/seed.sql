-- Fictional demo: the speak-up programme of a 600-person New Zealand and Australian freight group.
-- No real people or events. Dates move with the day you seed. Running the seed again changes nothing.
do $$ declare
 nz uuid; au uuid; wh uuid;
 o1 uuid; o2 uuid; o3 uuid; i1 uuid; r1 uuid; r2 uuid;
 w101 uuid; w102 uuid; w104 uuid; w105 uuid; w106 uuid; w107 uuid; w108 uuid; w109 uuid;
begin
if exists(select 1 from entities where ref='E-NZ') then return;end if;
if exists(select 1 from entities) then raise exception 'Demo seed requires an empty database';end if;

insert into holidays(on_date,name) values
 ('2026-10-26','Labour Day'),('2026-12-25','Christmas Day'),('2026-12-28','Boxing Day (observed)'),
 ('2027-01-01','New Year''s Day'),('2027-01-04','Day after New Year''s Day (observed)'),('2027-02-08','Waitangi Day (observed)'),
 ('2027-03-26','Good Friday'),('2027-03-29','Easter Monday'),('2027-04-26','Anzac Day (observed)')
 on conflict do nothing;

insert into entities(ref,name,jurisdiction,kind,policy_on,policy_location) values('E-NZ','Kowhai Freight Ltd','NZ','private',current_date-400,'Intranet > Policies > Speak Up (NZ)') returning id into nz;
insert into entities(ref,name,jurisdiction,kind,policy_on,policy_location) values('E-AU','Kowhai Freight Australia Pty Ltd','AU','large_proprietary',current_date-715,'Intranet > Policies > Whistleblower Policy (AU)') returning id into au;
insert into entities(ref,name,jurisdiction,kind) values('E-WH','Kowhai Warehousing Pty Ltd','AU','small_proprietary') returning id into wh;

insert into people(ref,name,role,title,email,entity_id,trained_on) values('O-01','Aroha Kingi','officer','Head of Risk and Assurance','aroha.kingi@example.com',nz,current_date-200) returning id into o1;
insert into people(ref,name,role,title,email,entity_id,trained_on) values('O-02','Ben Lacey','officer','Senior Investigations Manager','ben.lacey@example.com',au,current_date-800) returning id into o2;
insert into people(ref,name,role,title,email,entity_id,trained_on) values('O-03','Priya Shah','officer','People and Culture Partner','priya.shah@example.com',nz,current_date-100) returning id into o3;
insert into people(ref,name,role,title,email) values('I-01','Morgan Hale','investigator','External investigator, Hale Workplace Investigations','morgan@example.com') returning id into i1;
insert into people(ref,name,role,title,email,entity_id) values('R-01','Jo Whitcombe','recipient','Chair, Audit and Risk Committee','jo.whitcombe@example.com',nz) returning id into r1;
insert into people(ref,name,role,title,email,entity_id,trained_on) values('R-02','Tom Reddy','recipient','Chief Financial Officer, Australia','tom.reddy@example.com',au,current_date-300) returning id into r2;
insert into people(ref,name,role,title,email) values('B-01','Audit and Risk Committee','board','Receives the quarterly speak-up report','arc@example.com');

-- Investigating, NZ: the update to the discloser is overdue and an interview is late.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,next_step,next_step_due)
 values('WB-101',nz,current_date-40,'hotline',true,'Blue Kea','Hotline PIN 4471','employee','fraud','Christchurch depot','Fuel cards used for private vehicles on weekends, approved by the same supervisor.','high','investigating',o1,current_date-38,'protected','Employee who believes on reasonable grounds there is serious wrongdoing (misuse of company funds); meets the Act.',current_date-35,'Interview the depot supervisor',current_date-3) returning id into w101;
-- Investigating, AU: the discloser also told ASIC 85 days ago, the case is past target, and updates have lapsed.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,regulator_told_on,next_step,next_step_due)
 values('WB-102',au,current_date-100,'web',false,'Supplier contact','Personal email held by the case officer only','supplier','corruption','Procurement, Sydney','Pallet contract awarded after payments to a buyer''s family company.','high','investigating',o2,current_date-98,'protected','Supplier of goods to the company, disclosing suspected misconduct; eligible whistleblower.',current_date-95,current_date-85,'Receive the external investigator''s report',current_date+10) returning id into w102;
-- New, NZ: three days old and nobody assigned.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity)
 values('WB-103',nz,current_date-3,'email',true,'Night Owl','Anonymous mailbox thread 103','employee','bullying','Auckland warehouse, night shift','Shift lead shouts at and threatens new starters, who are leaving within weeks.','medium');
-- Assessing, NZ: named discloser, not acknowledged, protection not assessed, no next step.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id)
 values('WB-104',nz,current_date-25,'in_person',false,'Forklift operator','Mobile number held by the case officer only','employee','safety','Auckland warehouse','Forklift seat interlocks bypassed with cable ties to speed up loading.','high','assessing',o3) returning id into w104;
-- Closed, AU: outcome told, but a retaliation check is overdue.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,closed_on,finding,outcome,outcome_told_on)
 values('WB-105',au,current_date-200,'phone',true,'Discloser WB-105','Hotline PIN 2290','employee','harassment','Brisbane office','Manager makes comments about a staff member''s appearance in team meetings.','medium','closed',o2,current_date-199,'not_protected','Personal work-related grievance only; handled under the harassment policy with the same confidentiality.',current_date-195,current_date-120,'partly_substantiated','Manager coached and moved teams; refresher training for the team.',current_date-118) returning id into w105;
-- Closed, NZ: the discloser has not been told the outcome.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,closed_on,finding,outcome)
 values('WB-106',nz,current_date-150,'hotline',true,'Grey Heron','Hotline PIN 3318','employee','conflict_of_interest','Finance, Wellington','Finance manager approves invoices from a cousin''s cleaning company.','medium','closed',o1,current_date-148,'protected','Employee reporting possible serious wrongdoing; meets the Act.',current_date-145,current_date-90,'not_substantiated','Relationship declared in 2024 and approvals sit with a second manager; no breach found.') returning id into w106;
-- Investigating, AU: anonymous with no way to reply, gone quiet.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,protection,protection_note,assessed_on,next_step,next_step_due)
 values('WB-107',au,current_date-60,'web',true,'Discloser WB-107','','unknown','privacy','Customer service, Melbourne','Customer delivery addresses forwarded to a personal email account.','low','investigating',o2,'protected','Disclosure about possible breach of privacy law by an employee; treated as eligible.',current_date-55,'Check outbound mail logs for the named team',current_date+5) returning id into w107;
-- Assessing, NZ: the clean case. Everything on time.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,next_step,next_step_due)
 values('WB-108',nz,current_date-12,'hotline',true,'Kahu','Hotline PIN 5102','contractor','tax','Tauranga yard','Cash jobs on weekends not invoiced or recorded.','medium','assessing',o3,current_date-10,'protected','Contractor reporting suspected tax evasion; meets the Act.',current_date-8,'Compare weekend gate logs with invoices',current_date+7) returning id into w108;
-- Closed, AU: substantiated fraud from last year.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,closed_on,finding,outcome,outcome_told_on)
 values('WB-109',au,current_date-300,'hotline',true,'Discloser WB-109','Hotline PIN 1187','employee','fraud','Fleet, Perth','Tyre purchases invoiced for vehicles already sold.','high','closed',o2,current_date-299,'protected','Employee disclosing suspected fraud; eligible whistleblower.',current_date-296,current_date-250,'substantiated','Employee dismissed, loss recovered from final pay by agreement, referred to police.',current_date-248) returning id into w109;
-- Closed, NZ: a personal grievance, referred with consent.
insert into reports(ref,entity_id,received_on,channel,anonymous,alias,contact_route,relationship,category,area,summary,severity,status,officer_id,acknowledged_on,protection,protection_note,assessed_on,closed_on,finding,outcome,outcome_told_on)
 values('WB-110',nz,current_date-20,'email',false,'Driver, Hamilton','Work email','employee','personal_grievance','Hamilton depot','Unhappy with roster changes and pay rate after a restructure.','low','closed',o3,current_date-19,'not_protected','Personal employment complaint, not serious wrongdoing.',current_date-18,current_date-15,'referred','Referred to People and Culture under the grievance process, with the discloser''s agreement.',current_date-15);

insert into contacts(ref,report_id,on_date,direction,method,summary) values
 ('C-01',w101,current_date-38,'to_discloser','hotline','Acknowledged receipt and explained confidentiality and next steps.'),
 ('C-02',w101,current_date-30,'from_discloser','hotline','Gave the weekend dates the cards were used.'),
 ('C-03',w102,current_date-98,'to_discloser','email','Acknowledged receipt; explained protections and the eligible recipients.'),
 ('C-04',w102,current_date-60,'to_discloser','email','Investigator appointed; timing explained.'),
 ('C-05',w102,current_date-55,'from_discloser','email','Sent copies of two payment receipts.'),
 ('C-06',w105,current_date-199,'to_discloser','hotline','Acknowledged receipt.'),
 ('C-07',w105,current_date-118,'to_discloser','hotline','Told the outcome in general terms.'),
 ('C-08',w106,current_date-148,'to_discloser','hotline','Acknowledged receipt.'),
 ('C-09',w108,current_date-10,'to_discloser','hotline','Acknowledged receipt and explained the 20 working day timeline.'),
 ('C-10',w109,current_date-299,'to_discloser','hotline','Acknowledged receipt.'),
 ('C-11',w109,current_date-248,'to_discloser','hotline','Told the outcome.');

insert into actions(ref,report_id,description,owner_id,due_on,done_on,result) values
 ('A-01',w101,'Pull fuel card transactions for the last 12 months',o1,current_date-10,current_date-9,'14 transactions on weekends with no rostered shift.'),
 ('A-02',w101,'Interview the depot supervisor',i1,current_date-3,null,''),
 ('A-03',w102,'Secure procurement emails for the buyer',o2,current_date-80,current_date-79,'Mailbox held under legal hold.'),
 ('A-04',w102,'Investigator interviews: buyer and two suppliers',i1,current_date+5,null,''),
 ('A-05',w107,'Request mail log extract from IT',o2,current_date-20,null,''),
 ('A-06',w108,'Pull weekend gate logs for the last six months',o3,current_date+3,null,'');

insert into identity_disclosures(ref,report_id,on_date,told,told_by,basis,note) values
 ('ID-01',w102,current_date-62,'Morgan Hale, external investigator',o2,'consent','Written consent received by email before the appointment.'),
 ('ID-02',w104,current_date-6,'Site manager, Auckland warehouse',o3,'other','Named while arranging a time to talk; the discloser had not agreed.');

insert into retaliation_checks(ref,report_id,due_on,done_on,result,note) values
 ('RC-01',w105,current_date-110,current_date-108,'no_concern',''),
 ('RC-02',w105,current_date-30,null,null,''),
 ('RC-03',w109,current_date-160,current_date-158,'concern','Discloser said two colleagues stopped talking to them; manager briefed.'),
 ('RC-04',w101,current_date+7,null,null,''),
 ('RC-05',w106,current_date-60,current_date-58,'no_concern','');

insert into notes(ref,report_id,body,created_at) values
 ('N-01',w101,'Supervisor on leave until next week; interview moved.',now()-interval '5 days'),
 ('N-02',w102,'Investigator has the receipts; report expected within a fortnight.',now()-interval '20 days'),
 ('N-03',w104,'Walked the loading bay; two forklifts had ties on the seat switch.',now()-interval '22 days');
end $$;
