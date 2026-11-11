---
description: "Close a case with its finding and outcome"
---

# Close a case with its finding and outcome

Check `/case` first: every action done, protection assessed. Then run `node scripts/speakup.mjs close <report> --finding=substantiated|partly-substantiated|not-substantiated|no-action|referred --outcome="..." --json`. It schedules two retaliation checks when the discloser can be reached. Offer `/draft-outcome` next, then `node scripts/speakup.mjs told-outcome <report>` once it has gone.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
