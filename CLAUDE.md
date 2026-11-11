# Whistleblowing for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Record that the discloser has been acknowledged | `/acknowledge` |
| Add an investigation action or mark one done | `/action` |
| Record whether a report is a protected disclosure | `/assess` |
| Give a case to a case officer | `/assign` |
| Everything that needs a decision now, in priority order | `/attention` |
| The quarterly report to the board or audit and risk committee | `/board-report` |
| The whole file for one case | `/case` |
| Close a case with its finding and outcome | `/close` |
| Closed cases with findings and whether the discloser was told | `/closed` |
| Check the case records against the whistleblowing rules in docs/compliance.md, with the source cited for each flag | `/compliance` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it | `/customise` |
| Record that someone was told who the discloser is | `/disclose` |
| Draft the acknowledgement to a discloser | `/draft-acknowledgement` |
| Save the board report as a branded document | `/draft-board-report` |
| The confidential case file as one document | `/draft-case-file` |
| Draft the outcome message to a discloser | `/draft-outcome` |
| Draft a progress update to a discloser | `/draft-update` |
| Save the weekly review as a document | `/draft-weekly-review` |
| Group companies, their policies and their numbers | `/entities` |
| Export every record to CSV and one JSON snapshot | `/export` |
| The identity register: everyone told who a discloser is | `/identity` |
| Bring a case list across from NAVEX EthicsPoint | `/import` |
| Log a new report as it comes in | `/intake` |
| Move a case into investigation with its next step | `/investigate` |
| Add an internal case note | `/log` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view` | `/new-view` |
| Case officers, eligible recipients and investigators | `/people` |
| Every open case, most serious first | `/reports` |
| Retaliation checks due, overdue and found | `/retaliation` |
| Set or move the next step on a case | `/step` |
| Reports by quarter and category | `/trends` |
| Log an update sent to the discloser, or something they sent us | `/update` |
| The Monday speak-up review, from three commands | `/weekly-review` |
| Who is carrying which cases | `/workload` |

If an ask fits nothing here, run the CLI directly (`node scripts/speakup.mjs help`) and then propose a new command for it.

## Hard rules

- Never write a discloser's name into the database, a note, a draft or an answer. Use the alias and the reference. If the operator types a name, leave it out and say why.
- Every time anyone is told who a discloser is, record it with `/disclose` and the basis. Never tell anyone yourself.
- Reports, contacts, actions, identity disclosures, checks and notes are never deleted. The database refuses; do not work around it.
- Board and committee outputs carry numbers, categories and references only.
- Whether a disclosure is protected is a legal judgement. Record the officer's reasoning with `/assess`; do not make the call yourself.

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off NAVEX EthicsPoint.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/ethicspoint
