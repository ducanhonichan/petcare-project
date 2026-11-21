# PetCare deployment and vaccination reminders

## T33 Frontend deployment

- Build from `frontend/` with `npm ci` and `npm run build`. Publish `frontend/dist` (or `dist` when the host root is `frontend`).
- For an API hosted separately, set `VITE_API_BASE_URL` at build time to the public HTTPS base including `/api`. For an API behind the same origin, route `/api/*` to Express.
- Configure the host to serve `index.html` for client-side routes. Keep API and static assets routed independently. A direct page load or refresh on `/dashboard` or `/pets/:petId/visits` must work.
- Local Vite development defaults to `http://localhost:3000/api`. Use `frontend/.env.local` to override this when needed. The API base URL is public build configuration.
- After deployment, verify HTTPS, cross-origin access if applicable, login, My Pets, Weight Tracking, Veterinary Visits and Dashboard in a browser.

## T21 Reminder adapter

The frontend calls `GET /api/reminders/upcoming` with the current user's Bearer token. The cards and navigation badge read summary.overdue and summary.due_soon from T20.

```json
{ "summary": { "overdue": 2, "due_soon": 1, "later": 0, "total": 3 } }
```

The response mapping is implemented in `frontend/src/api/remindersApi.js`. A missing route shows unavailable status. A failed request or invalid response shows a retry action. A valid pair of zero counts displays both cards with zero and hides the badge.

## T27 Morning email draft

**Subject:** PetCare — Vaccinations due soon

```text
Hi {{ownerName}},

These vaccinations are due soon:

{{petName}} — {{vaccineName}} — due {{dueDate}}

Open PetCare to check your vaccination records:
{{frontendUrl}}

PetCare
```

Reuse getLatestDoses and getRemindBeforeDays in backend/src/services/reminders.service.js to find the latest dose per pet and vaccine within each owner's reminder window. Group due-soon items by owner and send one summary to that owner's account email. Schedule the job on the backend after the team confirms the morning time and timezone. Configure the SMTP transport and sender through backend environment variables or deployment secrets.

Verify the following with a stub mail transport before enabling real delivery:

- Zero due-soon items produces no sends. An overdue-only set produces no sends.
- Due today and the final day of the reminder window are included. Records outside the window are excluded.
- Only the latest dose per pet and vaccine contributes. Multiple pets for one owner appear in one email, and each owner receives only their own records.
- A repeated run for the same date or a restart can retry failed deliveries without repeating successful sends. Decide where to persist delivery results before enabling the schedule.
- A transport failure is observable without exposing credentials or blocking unrelated recipients.
