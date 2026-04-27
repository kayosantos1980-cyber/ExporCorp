# Security Specification - Employee Feedback & Ethics Channel

## 1. Data Invariants
- An employee check-in MUST have a `userId`, `userName`, and `date`.
- A check-in `averageScore` must be a number between 1 and 4.
- A report protocol MUST be unique (enforced by app logic) and match a specific pattern.
- A report status MUST be one of: 'recebida', 'em_análise', 'resolvida'.
- Only admins or the report creator (via protocol) should be able to read specific reports.
- Messages in leadership chat must have a `senderId` and `text`.

## 2. The "Dirty Dozen" Payloads (To be rejected)

1. **Identity Spoofing**: User A trying to create a check-in for User B.
2. **Identity Spoofing (Check-in)**: Attempting to update a check-in's `userId`.
3. **Admin Escalation**: User trying to mark themselves as `isAdmin: true` in their profile.
4. **Invalid Score**: Creating a check-in with `averageScore: 5`.
5. **Report Poisoning**: Creating a report with a 1MB string in `description`.
6. **Status Jumping**: Updating a report status directly to 'resolvida' without 'em_análise' phase (if enforced).
7. **Phantom Messages**: Creating a message with a future timestamp.
8. **Shadow Fields**: Creating a check-in with an extra `isVerified: true` field not in schema.
9. **Bulk Scraping**: Attempting to list all `users` profiles without being an admin.
10. **Report Hijacking**: Trying to update the `description` of an existing report.
11. **Negative Score**: Creating a check-in with `averageScore: -1`.
12. **Incomplete Record**: Creating a check-in missing the `responses` map.

## 3. Implementation Plan
- Use `isValidId()` for all document IDs.
- Use `isValid[Entity]()` for all creation/updates.
- Enforce `affectedKeys().hasOnly()` for specific update actions.
- Restrict `list` operations to prevent data leaks.
