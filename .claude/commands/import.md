---
description: "Bring a case list across from NAVEX EthicsPoint"
---

# Bring a case list across from NAVEX EthicsPoint

Read docs/replace-ethicspoint.md. Always run with `--dry-run` first: `node scripts/speakup.mjs import ethicspoint --file=<file.csv> [--jurisdiction=NZ|AU] [--mapping=map.json] --dry-run --json`. Show the row count, added versus updated, and every warning. Run again without `--dry-run` only when the operator says yes. Case managers must exist as officers first; new entities are created and listed in the warnings.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
