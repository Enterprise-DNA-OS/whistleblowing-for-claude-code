---
description: "Log a new report as it comes in"
---

# Log a new report as it comes in

Ask for: entity, how it came in (hotline, web, email, phone, in person, letter, manager, regulator referral), category, a short factual summary, severity, and the contact route the discloser chose (hotline PIN, anonymous mailbox, a number). Never record their name: use an alias. Then run `node scripts/speakup.mjs add report --ref=WB-<next> --entity=<ref> --channel=... --category=... --summary="..." --severity=... --alias="..." --contact-route="..." [--anonymous=no] [--area="..."] [--received-on=YYYY-MM-DD] --json`. Offer `/assign` next.

Start from the command output, never memory. Use record references in the answer. Never write a discloser's name into the database, a note or a draft.
