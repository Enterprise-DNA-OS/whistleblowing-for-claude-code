---
description: "Draft the acknowledgement to a discloser"
---

# Draft the acknowledgement to a discloser

Run `node scripts/speakup.mjs draft-acknowledgement <report> --json` and give the operator the file path. It is written to `drafts/`. Nothing is sent: the operator sends it through the discloser's own route, then runs `/acknowledge`.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
