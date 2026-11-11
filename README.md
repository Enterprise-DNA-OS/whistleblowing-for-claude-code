<h1 align="center">Whistleblowing for Claude Code</h1>

<p align="center">
  <strong>The open-source whistleblowing and speak-up case system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your NAVEX EthicsPoint data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=ethicspoint">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/ethicspoint?utm_source=github&utm_medium=readme&utm_campaign=ethicspoint">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-ethicspoint">Instead of NAVEX EthicsPoint</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Whistleblowing for Claude Code does the job you pay NAVEX EthicsPoint for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the NAVEX EthicsPoint dashboard cannot.

NAVEX publishes one EthicsPoint price: EthicsPoint Essentials starts at US$1,980 a year, for US businesses with 250 staff or fewer ([navex.com](https://www.navex.com/en-us/campaigns/epim-pricing-smb-dg/), checked 11 November 2026). Anything bigger, and anything outside the US, is quoted privately.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=ethicspoint).

It is for the person who runs a speak-up programme in New Zealand or Australia: a head of risk, a general counsel, a people and culture lead, a company secretary. It holds every report and what happened to it: who is handling it, when the discloser was acknowledged and updated, whether it is a protected disclosure, the investigation actions, who has been told the discloser's identity and why, the finding, and the retaliation checks afterwards. It never stores a discloser's name, and it checks the records against the New Zealand Protected Disclosures Act and the Australian Corporations Act rules, with each source cited.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/whistleblowing-for-claude-code.git
cd whistleblowing-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`: twenty-one things the demo programme needs to deal with, overdue acknowledgements and an identity told without a basis first.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/acknowledge` | Record that the discloser has been acknowledged. |
| `/action` | Add an investigation action or mark one done. |
| `/assess` | Record whether a report is a protected disclosure. |
| `/assign` | Give a case to a case officer. |
| `/attention` | Everything that needs a decision now, in priority order. |
| `/board-report` | The quarterly report to the board or audit and risk committee. |
| `/case` | The whole file for one case. |
| `/close` | Close a case with its finding and outcome. |
| `/closed` | Closed cases with findings and whether the discloser was told. |
| `/compliance` | Check the case records against the whistleblowing rules in docs/compliance.md, with the source cited for each flag. |
| `/customise` | Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. |
| `/disclose` | Record that someone was told who the discloser is. |
| `/draft-acknowledgement` | Draft the acknowledgement to a discloser. |
| `/draft-board-report` | Save the board report as a branded document. |
| `/draft-case-file` | The confidential case file as one document. |
| `/draft-outcome` | Draft the outcome message to a discloser. |
| `/draft-update` | Draft a progress update to a discloser. |
| `/draft-weekly-review` | Save the weekly review as a document. |
| `/entities` | Group companies, their policies and their numbers. |
| `/export` | Export every record to CSV and one JSON snapshot. |
| `/identity` | The identity register: everyone told who a discloser is. |
| `/import` | Bring a case list across from NAVEX EthicsPoint. |
| `/intake` | Log a new report as it comes in. |
| `/investigate` | Move a case into investigation with its next step. |
| `/log` | Add an internal case note. |
| `/new-view` | Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. |
| `/people` | Case officers, eligible recipients and investigators. |
| `/reports` | Every open case, most serious first. |
| `/retaliation` | Retaliation checks due, overdue and found. |
| `/step` | Set or move the next step on a case. |
| `/trends` | Reports by quarter and category. |
| `/update` | Log an update sent to the discloser, or something they sent us. |
| `/weekly-review` | The Monday speak-up review, from three commands. |
| `/workload` | Who is carrying which cases. |

`npm run view` renders three read-only pages: the speak-up week, the deadlines that protect the discloser, and how the programme is working. `npm run docs` renders a confidential case file per report, a board report per group company (numbers and categories only) and a policy and recipients register per company, in your brand from `brand.json`.

## Ten questions to ask on day one

1. Which reports are still not acknowledged, and how many New Zealand working days are left on each?
2. Which disclosers have not heard from us in 30 days, and what did we last tell them?
3. Who has been told a discloser's identity, by whom, and on what basis?
4. Which Australian cases had the discloser go to ASIC or APRA, and when is the 90-day point?
5. Which closed cases are due a retaliation check, and where did a check find a concern?
6. Which open cases have no protection assessment after two weeks?
7. Which group company has the most reports in the last 12 months, and how many were anonymous?
8. How long do substantiated cases take from receipt to close, by category, quarter by quarter?
9. Which eligible recipients and case officers have not been trained in the last two years?
10. Which Australian companies in the group need a whistleblower policy, and when is each one due for review?

## Your first hour: ten things to ask for

1. "Add our group companies, which ones are large proprietary companies, and when each policy was last reviewed."
2. "Add our case officers and eligible recipients, with when they were last trained."
3. "Import our EthicsPoint case list from this spreadsheet." (`/import`, dry run first)
4. "What is overdue right now?" (`/attention`)
5. "A new hotline report came in this morning about a safety issue in the Auckland warehouse. Log it." (`/intake`)
6. "Draft the acknowledgement for that report." (`/draft-acknowledgement`)
7. "Add our regional anniversary day to the holidays." 
8. "Change the Australian acknowledgement target to three days." (`/customise`)
9. "Write the quarterly report for the audit and risk committee." (`/board-report`)
10. "Make me a page I can print for Monday's case review." (`/new-view`)

## Rules it checks

[docs/compliance.md](docs/compliance.md) lists every check with its source: the New Zealand 20 working day timeline, confidentiality of identity, whistleblower policies for Australian public and large proprietary companies (and procedures for New Zealand public sector organisations), the Australian public interest 90-day point, and retaliation checks. It never decides whether a disclosure is protected or gives legal advice.

## Instead of NAVEX EthicsPoint

Read [docs/replace-ethicspoint.md](docs/replace-ethicspoint.md). Run your EthicsPoint case report, save it as CSV, and import it with one command, test run first. The import never brings a reporter's name across. Message threads and attachments stay in EthicsPoint until you no longer need them.

## Architecture

```
whistleblowing-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/speakup.mjs       the one CLI, --json on every command
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     compliance rules with sources, the EthicsPoint guide, why no front end
  views.json, documents.json  the read-only pages and documents
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Whistleblowing for Claude Code for your business, migrates your NAVEX EthicsPoint cases, builds the secure reporting form and line that write straight into it, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=ethicspoint)
- Read more: [enterprisedna.co/omni/instead-of/ethicspoint](https://enterprisedna.co/omni/instead-of/ethicspoint?utm_source=github&utm_medium=readme&utm_campaign=ethicspoint)

## License

MIT. Copyright (c) 2026 Enterprise DNA. NAVEX and EthicsPoint are trademarks of their owner. This project is not affiliated with or endorsed by NAVEX.
