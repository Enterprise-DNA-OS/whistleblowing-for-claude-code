---
description: "Give a case to a case officer"
---

# Give a case to a case officer

Run `node scripts/speakup.mjs assign <report> --officer=<person> --json`. Only people with the officer role can hold a case. Check `/workload` first and say if the officer is already over the limit.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
