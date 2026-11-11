---
description: "Record that someone was told who the discloser is"
---

# Record that someone was told who the discloser is

Run `node scripts/speakup.mjs disclose <report> --told="<who was told>" --by=<person> --basis=consent|regulator|police|lawyer|investigation-need|other --note="..." --json`. Ask for the basis every time. "Other" needs a note and is flagged on `/compliance`: it may be a breach of confidentiality, so say so plainly and suggest the general counsel reviews it.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
