---
description: "Record that the discloser has been acknowledged"
---

# Record that the discloser has been acknowledged

Draft the message first with `/draft-acknowledgement` if the operator has not sent one. Once it has gone through the discloser's own route, run `node scripts/speakup.mjs acknowledge <report> [--date=YYYY-MM-DD] [--method=...] [--text="..."] --json`. It logs the contact and stamps the date.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
