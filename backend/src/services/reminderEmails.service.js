const fs = require('node:fs/promises');
const path = require('node:path');
const { classify } = require('./reminders.service');

function dateInZone(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function createDeliveryStore(directory) {
  function filename(userId, day) {
    return path.join(directory, `${day}-${userId}.json`);
  }

  return {
    async claim(userId, day) {
      await fs.mkdir(directory, { recursive: true });
      let file;
      try {
        file = await fs.open(filename(userId, day), 'wx');
      } catch (error) {
        if (error.code === 'EEXIST') return false;
        throw error;
      }
      try {
        await file.writeFile(JSON.stringify({ status: 'pending', userId, day }));
        await file.sync();
      } finally {
        await file.close();
      }
      return true;
    },
    async complete(userId, day, status) {
      const target = filename(userId, day);
      const temporary = target + '.tmp';
      await fs.writeFile(temporary, JSON.stringify({
        status, userId, day, updatedAt: new Date().toISOString(),
      }));
      await fs.rename(temporary, target);
    },
  };
}

// Dependencies keep delivery tests independent of SMTP and live database writes.
async function runReminderEmails({
  listUsers, getLatestDoses, sendMail, store, from, frontendUrl, timezone,
  dryRun = true, now = new Date(), onError = () => {},
}) {
  const today = dateInZone(now, timezone);
  const summary = { today, dryRun, eligibleUsers: 0, doseCount: 0, sent: 0, skipped: 0, failed: 0 };
  const users = await listUsers();

  for (const user of users) {
    try {
      const doses = await getLatestDoses(user.id);
      const upcoming = doses.filter((dose) =>
        classify(dose.next_due_date, today, user.remind_before_days).status === 'DUE_SOON'
      );
      if (!upcoming.length) continue;

      summary.eligibleUsers += 1;
      summary.doseCount += upcoming.length;
      if (dryRun) continue;

      if (!await store.claim(user.id, today)) {
        summary.skipped += 1;
        continue;
      }

      const lines = upcoming.map((dose) =>
        `- ${dose.pet_name}: ${dose.vaccine_name} — due ${dose.next_due_date}`
      );
      const text = [
        `Hi ${user.name},`, '', 'These vaccinations are due soon:', ...lines, '',
        `Open PetCare to check your vaccination records: ${frontendUrl}`, '', 'PetCare',
      ].join('\n');

      try {
        await sendMail({ from, to: { address: user.email }, subject: 'PetCare — Vaccinations due soon', text });
      } catch (error) {
        await store.complete(user.id, today, 'failed');
        throw error;
      }
      await store.complete(user.id, today, 'sent');
      summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      onError({ userId: user.id, code: error.code || 'REMINDER_DELIVERY_FAILED' });
    }
  }
  return summary;
}

module.exports = { dateInZone, createDeliveryStore, runReminderEmails };
