---
description: "Retaliation checks due, overdue and found"
---

# Retaliation checks due, overdue and found

Run `node scripts/speakup.mjs retaliation --json`. Show overdue first, then due in the next 14 days, then any concern or detriment found. To record one: `node scripts/speakup.mjs check <check> --result=no-concern|concern|detriment --note="..." --json`.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
