const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { dateInZone, createDeliveryStore, runReminderEmails } = require('../src/services/reminderEmails.service');

test('calendar dates follow the configured timezone at midnight', () => {
  const now = new Date('2026-11-20T00:30:00Z');
  assert.equal(dateInZone(now, 'Asia/Ho_Chi_Minh'), '2026-11-20');
  assert.equal(dateInZone(now, 'America/Los_Angeles'), '2026-11-19');
});

test('dry-run groups only due-soon doses within each owners reminder window', async () => {
  const selected = [];
  const result = await runReminderEmails({
    timezone: 'UTC', now: new Date('2026-11-20T08:00:00Z'),
    listUsers: async () => [
      { id: 1, name: 'One', email: 'one@example.test', remind_before_days: 7 },
      { id: 2, name: 'Two', email: 'two@example.test', remind_before_days: 1 },
    ],
    getLatestDoses: async (id) => {
      selected.push(id);
      return ['2026-11-19', '2026-11-20', '2026-11-27', '2026-11-28'].map(
        (next_due_date) => ({ next_due_date })
      );
    },
    store: { claim: () => assert.fail('Dry-run must not claim a delivery') },
    sendMail: () => assert.fail('Dry-run must not send'),
  });
  assert.deepEqual(selected, [1, 2]);
  assert.equal(result.eligibleUsers, 2);
  assert.equal(result.doseCount, 3);
  assert.equal(result.sent, 0);
});

test('persistent claims isolate recipients and prevent repeats after restart or overlapping runs', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'petcare-mail-test-'));
  try {
    const sent = [];
    const options = {
      timezone: 'UTC', now: new Date('2026-11-20T08:00:00Z'), dryRun: false,
      from: 'PetCare <from@example.test>', frontendUrl: 'https://petcare.example/',
      listUsers: async () => [1, 2].map((id) => ({
        id, name: 'Owner', email: `owner${id}@example.test`, remind_before_days: 7,
      })),
      getLatestDoses: async (id) => [
        { pet_name: 'Pet ' + id, vaccine_name: 'Rabies', next_due_date: '2026-11-20' },
        { pet_name: 'Pet ' + id, vaccine_name: 'Other', next_due_date: '2026-11-27' },
      ],
      sendMail: async (message) => { sent.push(message); },
    };
    await Promise.all([
      runReminderEmails({ ...options, store: createDeliveryStore(directory) }),
      runReminderEmails({ ...options, store: createDeliveryStore(directory) }),
    ]);
    assert.equal(sent.length, 2);
    assert.equal(sent[0].to.address.includes('@example.test'), true);
    for (const message of sent) {
      const id = message.to.address.includes('owner1') ? 1 : 2;
      assert.ok(message.text.includes('Pet ' + id));
      assert.ok(!message.text.includes('Pet ' + (id === 1 ? 2 : 1)));
    }
    const restarted = await runReminderEmails({ ...options, store: createDeliveryStore(directory) });
    assert.equal(restarted.sent, 0);
    assert.equal(restarted.skipped, 2);
    const nextDay = await runReminderEmails({
      ...options, now: new Date('2026-11-21T08:00:00Z'), store: createDeliveryStore(directory),
    });
    assert.equal(nextDay.sent, 2);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('one SMTP failure is recorded and does not stop other owners or repeat automatically', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'petcare-mail-test-'));
  try {
    const options = {
      timezone: 'UTC', now: new Date('2026-11-20T08:00:00Z'), dryRun: false,
      from: 'from@example.test', frontendUrl: 'https://petcare.example/',
      listUsers: async () => [1, 2].map((id) => ({
        id, name: 'Owner', email: `owner${id}@example.test`, remind_before_days: 7,
      })),
      getLatestDoses: async () => [
        { pet_name: 'Pet', vaccine_name: 'Rabies', next_due_date: '2026-11-20' },
      ],
      store: createDeliveryStore(directory),
      sendMail: async ({ to }) => {
        if (to.address.startsWith('owner1')) throw Object.assign(new Error('Fixture'), { code: 'ETIMEDOUT' });
      },
    };
    const first = await runReminderEmails(options);
    assert.equal(first.failed, 1);
    assert.equal(first.sent, 1);
    const ledger = JSON.parse(await fs.readFile(path.join(directory, '2026-11-20-1.json'), 'utf8'));
    assert.equal(ledger.status, 'failed');
    const restarted = await runReminderEmails(options);
    assert.equal(restarted.skipped, 2);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('empty or overdue-only users produce no messages and no delivery files', async () => {
  for (const dates of [[], ['2026-11-19'], ['2026-11-28']]) {
    const result = await runReminderEmails({
      timezone: 'UTC', now: new Date('2026-11-20T08:00:00Z'), dryRun: false,
      listUsers: async () => [{ id: 1, remind_before_days: 7 }],
      getLatestDoses: async () => dates.map((next_due_date) => ({ next_due_date })),
      store: { claim: () => assert.fail('No eligible dose should create a claim') },
      sendMail: () => assert.fail('No eligible dose should send an email'),
    });
    assert.equal(result.eligibleUsers, 0);
    assert.equal(result.sent, 0);
  }
});

test('a pending delivery survives worker restart and remains excluded', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'petcare-mail-test-'));
  try {
    const first = createDeliveryStore(directory);
    assert.equal(await first.claim(1, '2026-11-20'), true);
    const restarted = createDeliveryStore(directory);
    assert.equal(await restarted.claim(1, '2026-11-20'), false);
    const pending = JSON.parse(await fs.readFile(path.join(directory, '2026-11-20-1.json'), 'utf8'));
    assert.equal(pending.status, 'pending');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
