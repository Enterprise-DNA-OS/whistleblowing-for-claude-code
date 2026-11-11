---
description: "Add an investigation action or mark one done"
---

# Add an investigation action or mark one done

To add: `node scripts/speakup.mjs add action --ref=A-<next> --report=<report> --description="..." --owner=<officer or investigator> --due=YYYY-MM-DD --json`. To finish: `node scripts/speakup.mjs done <action> --result="<what was found>" --json`. Open actions: `node scripts/speakup.mjs actions --json`.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
