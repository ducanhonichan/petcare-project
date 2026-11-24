# Weight measurement rules (R2)

- Accept 0.01 to 150 kg inclusive, with at most two decimal places.
- Reject a measurement whose calendar day is after the backend's current day.
  GET weight history returns `today` so the form uses the same cutoff.
- Allow one record per active pet per calendar day, regardless of measurement time.
  A record may be edited on its own day. A conflicting create/update returns 409.
- Return measurement timestamps as `YYYY-MM-DD HH:mm:ss` without converting the
  stored calendar day between timezones.

The API locks the active pet row in a transaction before checking the day's
records and writing. All API create/update paths use that lock, so concurrent
requests for the same pet cannot both create a record on the same day.

No migration is required and existing records are preserved. Legacy duplicate
days are not cleaned up automatically; move a record to another day or remove a
duplicate through the normal UI if needed. These rules apply to API writes;
direct database imports must also respect them.

Deploy both backend and frontend from the updated main branch. The backend uses
its local server timezone to define today; set the deployment's timezone to the
intended operating timezone consistently with other calendar-date features.

Validation: `node --test test/admin.test.js test/photos-dashboard.test.js
test/reminderEmails.test.js test/validation.test.js test/weights.test.js` in
backend; `npm run lint` and `npm run build` in frontend. Weight tests exercise HTTP
validation and the service with a mock database, including simultaneous requests,
rollback and connection release. They do not replace an online database smoke test.
