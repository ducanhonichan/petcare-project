const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { getLatestDoses } = require('../services/reminders.service');
const { dateInZone, createDeliveryStore, runReminderEmails } = require('../services/reminderEmails.service');

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--send', '--schedule'].includes(arg))) {
    throw new Error('Use --send for delivery and --schedule for a persistent scheduler.');
  }
  const dryRun = !args.includes('--send');
  const scheduled = args.includes('--schedule');
  const timezone = required('REMINDER_TIME_ZONE');
  dateInZone(new Date(), timezone);

  let transport;
  let from;
  let frontendUrl;
  let store;
  if (!dryRun) {
    const port = Number(required('SMTP_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT');
    const url = new URL(required('FRONTEND_URL'));
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('FRONTEND_URL must use HTTP or HTTPS');
    frontendUrl = url.href;
    from = required('SMTP_FROM');
    store = createDeliveryStore(path.resolve(required('REMINDER_DELIVERY_DIR')));
    transport = nodemailer.createTransport({
      host: required('SMTP_HOST'), port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    });
    await transport.verify();
  }

  const run = async () => {
    const result = await runReminderEmails({
      listUsers: async () => {
        const [users] = await pool.query(
          'SELECT id, name, email, remind_before_days FROM users WHERE is_banned = FALSE ORDER BY id'
        );
        return users;
      },
      getLatestDoses, dryRun, store, from, frontendUrl, timezone,
      sendMail: (message) => transport.sendMail(message),
      onError: (details) => console.error('Reminder delivery failed', details),
    });
    console.log(JSON.stringify(result));
    return result;
  };

  if (scheduled) {
    const expression = required('REMINDER_CRON');
    if (!cron.validate(expression)) throw new Error('Invalid REMINDER_CRON');
    const task = cron.schedule(expression, async () => {
      try { await run(); } catch (error) {
        console.error('Reminder run failed', { code: error.code || error.name });
      }
    }, { timezone, noOverlap: true });
    console.log(JSON.stringify({ scheduled: true, dryRun, timezone, expression }));
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, async () => {
        await task.stop();
        await pool.end();
        transport?.close();
      });
    }
  } else {
    try {
      const result = await run();
      if (result.failed) process.exitCode = 1;
    } finally {
      await pool.end();
      transport?.close();
    }
  }
}

main().catch(async (error) => {
  console.error('Email reminder job failed', { code: error.code || error.name, message:
    error.message?.startsWith('Missing ') || error.message?.startsWith('Invalid ') ||
    error.message?.startsWith('Use ') ? error.message : 'Check the job configuration and service availability.' });
  process.exitCode = 1;
  await pool.end();
});
