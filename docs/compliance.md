# Compliance checks and office policies

Checked 11 November 2026. This is a record-keeping aid for whoever runs a speak-up programme in New Zealand or Australia. It does not give legal advice or decide whether a disclosure is protected. The general counsel or an outside lawyer decides. `node scripts/speakup.mjs compliance --json` returns each flag with its source.

| Check | What the code checks | Basis and limit |
|---|---|---|
| ACKNOWLEDGE | An open report with a way to reach the discloser and no acknowledgement, flagged five days before it is due. New Zealand: due 20 working days after receipt. Australia: due `ack_days_au` calendar days after receipt (7 by default) | New Zealand: the [Ombudsman's guidance on the Protected Disclosures (Protection of Whistleblowers) Act 2022](https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/protected-disclosures-information) says a receiver should, within 20 working days, acknowledge the disclosure and when it was received, consider whether to investigate, check whether it was disclosed elsewhere, deal with it, and tell the discloser what has been done or is being done (section 13). Australia: the Corporations Act sets no acknowledgement deadline, so the Australian figure is office policy. |
| NZ-20-WORKING-DAYS | A New Zealand case past its 20 working days with no update to the discloser after the acknowledgement | Same Ombudsman page: if the matter cannot be dealt with in 20 working days, the receiver should tell the discloser how long it is expected to take and keep them updated. |
| IDENTITY | Anyone told a discloser's identity on a basis recorded as "other" | New Zealand: a receiver must avoid identifying the discloser, with some exceptions ([Ombudsman, as above](https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/protected-disclosures-information)). Australia: [ASIC, protections for corporate sector whistleblowers](https://www.asic.gov.au/about-asic/asic-investigations-and-enforcement/whistleblowing/protections-for-corporate-sector-whistleblowers) sets out the confidentiality protection and when identity may be shared (for example with ASIC, APRA, the police, a lawyer, or with consent). The register records every disclosure; the code only flags the ones with no permitted basis named. |
| POLICY | An Australian public company, large proprietary company or superannuation trustee, or a New Zealand public sector organisation, with no policy recorded or a review due within 30 days | Australia: [ASIC RG 270](https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-270-whistleblower-policies) covers the requirement in section 1317AI of the Corporations Act for public companies, large proprietary companies and proprietary companies that are trustees of registrable superannuation entities to have a whistleblower policy and make it available to officers and employees. New Zealand: the Ombudsman says public sector organisations must have procedures for receiving and dealing with protected disclosures and make them available to staff; private sector organisations are not required to. The review interval (`policy_review_months`, 24) is office policy. Whether a proprietary company is "large" is for your accountant to confirm each year: record it in `kind`. |
| PUBLIC-INTEREST | An open Australian case where the discloser told ASIC or APRA, once `public_interest_watch_days` (75) have passed since | [ASIC, as above](https://www.asic.gov.au/about-asic/asic-investigations-and-enforcement/whistleblowing/protections-for-corporate-sector-whistleblowers): a discloser who has already reported to ASIC or APRA may, after 90 days and on conditions, make a public interest disclosure to a journalist or member of parliament. The flag is a warning that the 90-day point is near, not a judgement that it applies. |
| RETALIATION | A retaliation check past its due date, or detriment found on a case still open | Both countries protect disclosers from retaliation and victimisation ([Ombudsman](https://www.ombudsman.parliament.nz/what-ombudsman-can-help/serious-wrongdoing-work-whistleblowing/make-protected-disclosure); [ASIC](https://www.asic.gov.au/about-asic/asic-investigations-and-enforcement/whistleblowing/protections-for-corporate-sector-whistleblowers)). The checks themselves, 30 and 90 days after a case closes, are office policy. |

## Working days

New Zealand deadlines count Monday to Friday, less every date in the `holidays` table. The demo loads national public holidays from October 2026 to April 2027. Add your regional anniversary day and any other dates your lawyer confirms do not count: `node scripts/speakup.mjs holiday 2027-01-25 --name="Wellington Anniversary"`.

## Office policies (settings, not law)

| Setting | Default | Used for |
|---|---|---|
| `ack_working_days` | 20 | New Zealand acknowledgement and 20 working day check |
| `ack_days_au` | 7 | Australian acknowledgement (office policy) |
| `triage_days` | 2 | Report with no case officer |
| `update_days` | 30 | Discloser not updated |
| `quiet_days` | 21 | Open case with no note or contact |
| `target_close_days` | 90 | Case past target |
| `public_interest_watch_days` | 75 | Public interest watch |
| `policy_review_months` | 24 | Policy review due |
| `training_months` | 24 | Recipients and officers due for training |
| `retaliation_first_days`, `retaliation_second_days` | 30, 90 | Retaliation checks scheduled on close |
| `max_open_cases` | 5 | Officer workload flag |

Change any of them with `/customise` (one line in a new migration).

## What the database refuses

A discloser's name: there is no column for it, only an alias and a contact route. A named report with no contact route. A case past "received" with no case officer, or a case officer who does not hold the officer role. Investigating or closing before the discloser is acknowledged, unless there is no way to reach them. A protection decision with no reasoning. Closing a case with open actions, no protection assessment, no finding or no outcome. An identity disclosure on an "other" basis with no note. A retaliation finding of concern or detriment with no note. Deleting a report, a contact, an action, an identity disclosure, a retaliation check, a note or an audit event. These are data checks, not legal judgements.
