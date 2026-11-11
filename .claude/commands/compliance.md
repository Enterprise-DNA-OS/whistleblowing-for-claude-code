---
description: "Check the case records against the whistleblowing rules in docs/compliance.md, with the source cited for each flag"
---

# Check the case records against the whistleblowing rules

1. Run `node scripts/speakup.mjs compliance --json`. Each row has the record, the rule, the issue and the source.
2. Report as a table: rule, record, issue, source. Breached first (overdue acknowledgements, an identity told on an "other" basis, a detriment found), then what falls due in the next week.
3. For each one, name the fix the operator can approve: acknowledge or update the discloser (draft to `drafts/`, never send), review the identity disclosure with the general counsel, record the retaliation check, or record the policy review.
4. If a rule in `docs/compliance.md` looks out of date, say so and stop. Do not guess at law. The operator confirms the rule, then you update the doc and the check together.

Nothing here is legal advice. The doc records the rules the operator has told the system to enforce, with sources, and this command checks the data against them.
