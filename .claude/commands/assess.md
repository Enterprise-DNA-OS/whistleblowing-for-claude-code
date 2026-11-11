---
description: "Record whether a report is a protected disclosure"
---

# Record whether a report is a protected disclosure

Read the case with `/case`. Then run `node scripts/speakup.mjs assess <report> --protection=protected|not-protected --note="<why, in one sentence>" --json`. The note is the reasoning a regulator or lawyer would read: who the discloser is to the business and what kind of wrongdoing. If unsure, say so and leave it pending for the general counsel. Treat a not-protected report with the same confidentiality.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
