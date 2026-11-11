# Move off NAVEX EthicsPoint

Checked 11 November 2026. NAVEX publishes one EthicsPoint price: [EthicsPoint Essentials](https://www.navex.com/en-us/campaigns/epim-pricing-smb-dg/) "starts at $1,980 per year" (US dollars), for US-based businesses with 250 employees or fewer, with web and phone reporting and simple case management. Larger programmes are quoted privately. NAVEX does not publish an export format, and case lists are set up differently in each account, so the import here reads **a case list saved as CSV**: run your case report in EthicsPoint, save it from Excel as CSV, and check the headers. The example files in the tests are made up.

## Before you start

1. Keep your reporting line running. The free version does not take reports from the public. Until you move your hotline or web form, new reports still arrive through EthicsPoint and a case officer logs them here with `/intake`.
2. Add your case officers: `node scripts/speakup.mjs add person --ref=O-01 --name="..." --role=officer --title="..."`. The import matches each case manager by name.
3. Add your group companies with the right kind: `node scripts/speakup.mjs add entity --ref=E-AU --name="..." --jurisdiction=AU --kind=large_proprietary --policy-on=YYYY-MM-DD`. Companies the import has not seen are created as private and listed in the warnings.

## Columns read by default

First match wins; case does not matter.

| Field | Column names tried |
|---|---|
| ref | Report Key, Report Number, Case Number, Case ID, Issue ID, Reference, Ref |
| entity | Organization, Organisation, Company, Entity, Legal Entity, Business Unit |
| received | Date Received, Received Date, Report Date, Date Reported, Created Date, Received |
| channel | Intake Method, Report Method, Source, Channel |
| anonymous | Anonymous, Is Anonymous, Reporter Anonymous (blank means anonymous) |
| category | Primary Issue, Issue Type, Allegation Type, Category |
| area | Location, Site, Branch, Department |
| summary | Summary, Description, Allegation, Details |
| severity | Priority, Severity, Risk |
| status | Case Status, Status, Stage |
| officer | Case Manager, Case Owner, Assigned To, Investigator, Owner |
| acknowledged | Date Acknowledged, Acknowledged Date, Acknowledged |
| closed, finding, outcome | Date Closed, Closed Date, Close Date / Finding, Disposition, Substantiated, Outcome / Resolution, Action Taken, Closure Summary, Outcome Detail |

```bash
node scripts/speakup.mjs import ethicspoint --file=imports/cases.csv --jurisdiction=AU --dry-run --json
node scripts/speakup.mjs import ethicspoint --file=imports/cases.csv --jurisdiction=AU
```

When your headers differ, write a mapping and pass `--mapping=imports/map.json`:

```json
{"ref":"Case","entity":"Company","category":"Issue","summary":"What happened"}
```

## What maps and what does not

- **Issue types** map to fraud, corruption, safety, bullying, harassment, discrimination, privacy, financial reporting, tax, regulatory, conflict of interest, retaliation, personal grievance or other. "Accounting and Auditing" becomes financial reporting, "Gifts and Entertainment" becomes conflict of interest, "Bribery" becomes corruption. An issue type the importer does not know comes in as other, with a warning naming it.
- **Status:** a closed case needs a finding, an outcome and a close date here. A closed case missing any of them comes in open, with a warning to close it properly. An investigating case with no acknowledgement date comes in as assessing. A case with no matching case manager comes in as received.
- **Identity:** the import never brings a reporter's name across, even if your export has one. Named reports come in with the alias "Named in EthicsPoint" and the contact route pointing back to the report key.
- **Not carried over:** the message thread between reporter and case manager, attachments, PIN numbers and anything the reporter typed in follow-ups. Keep EthicsPoint read-only for those until your retention period ends, or save the case PDFs in your own document store and note the location with `/log`.
- **Re-running is safe.** Rows match on the report key and update in place. A bad row stops the whole import and names the row, so nothing is half-loaded.

## The order that works

1. Import closed cases from the last two years, so `/trends` and `/board-report` have history.
2. Import open cases. Work through the warnings: assign officers, record acknowledgements, assess protection.
3. Run `/compliance` and `/attention`. Fix what they show.
4. Move the reporting line (hotline number, web form, mailbox) and record the new contact route on each open case.
5. Keep EthicsPoint read-only until the last open case closes, then end the subscription.
