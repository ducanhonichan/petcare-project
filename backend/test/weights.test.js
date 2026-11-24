const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { todayString, addDays } = require('../src/utils/dates');
let rows = [], nextId = 1, failWrite = false, active = true;
const locks = new Map();
const statements = [];
let commits = 0, rollbacks = 0, releases = 0;
async function acquire(id) {
  const previous = locks.get(id) || Promise.resolve();
  let unlock;
  const current = new Promise(resolve => { unlock = resolve; });
  locks.set(id, current);
  await previous;
  return unlock;
}
const pool = {
  query: async (sql, params = []) => {
    if (sql.includes('SELECT id, role, is_banned FROM users')) return [[{ id: params[0], role: 'USER', is_banned: 0 }]];
    if (sql.includes('FROM pets')) return [[4, 5].includes(params[0]) && params[1] === 1 && active ? [{ id: params[0] }] : []];
    if (sql.startsWith('DELETE')) { const before = rows.length; rows = rows.filter(row => !(row.id === params[0] && row.pet_id === params[1])); return [{ affectedRows: before - rows.length }]; }
    if (sql.includes('FROM weight_logs')) {
      return [sql.includes('WHERE id = ?') ? rows.filter(row => row.id === params[0] && row.pet_id === params[1]) : rows.filter(row => row.pet_id === params[0])];
    }
    throw new Error('Unexpected query: ' + sql);
  },
  getConnection: async () => {
    let unlock;
    return {
      beginTransaction: async () => {},
      query: async (sql, params) => {
        statements.push(sql);
        if (sql.includes('FROM pets')) { unlock = await acquire(params[0]); return [active ? [{ id: params[0] }] : []]; }
        if (sql.includes('FROM weight_logs')) {
          return [rows.filter(row => row.pet_id === params[0] && row.measured_at.slice(0, 10) === params[1].slice(0, 10) && row.id !== params[3]).slice(0, 1)];
        }
        if (failWrite) throw new Error('Simulated database failure');
        if (sql.startsWith('INSERT')) {
          const row = { id: nextId++, pet_id: params[0], weight_kg: params[1], measured_at: params[2], note: params[3] };
          rows.push(row); return [{ insertId: row.id }];
        }
        if (sql.startsWith('UPDATE')) {
          const row = rows.find(row => row.id === params[3] && row.pet_id === params[4]);
          if (row) Object.assign(row, { weight_kg: params[0], measured_at: params[1], note: params[2] });
          return [{ affectedRows: 0 }];
        }
        throw new Error('Unexpected transaction query');
      },
      commit: async () => { commits++; unlock?.(); unlock = null; },
      rollback: async () => { rollbacks++; unlock?.(); unlock = null; },
      release: () => { releases++; unlock?.(); },
    };
  },
};
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: pool };
const jwtPath = require.resolve('../src/config/jwt');
require.cache[jwtPath] = { id: jwtPath, filename: jwtPath, loaded: true, exports: { secret: 'weight-test-secret' } };
const service = require('../src/services/weights.service');
const app = express(); app.use(express.json()); app.use('/api/pets', require('../src/routes/weights.routes'));
app.use((err, req, res, next) => res.status(500).json({ message: 'Internal server error' }));
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: 1 }, 'weight-test-secret') };

test('R2 weight rules across API and transactional service', async t => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/pets';
  const day = addDays(todayString(), -10), tomorrow = addDays(todayString(), 1);
  const body = (weight, date = day, time = '08:00') => ({ weight_kg: weight, measured_at: date + ' ' + time });
  async function call(method, path, data, auth = headers) {
    const res = await fetch(base + path, { method, headers: auth, body: data ? JSON.stringify(data) : undefined });
    return { status: res.status, body: await res.json() };
  }
  await t.test('rejects absent authentication and another owner before writing', async () => {
    assert.equal((await call('POST', '/4/weights', body(8), {})).status, 401);
    const other = { ...headers, Authorization: 'Bearer ' + jwt.sign({ id: 2 }, 'weight-test-secret') };
    assert.equal((await call('POST', '/4/weights', body(8), other)).status, 404);
    assert.equal(rows.length, 0);
  });
  await t.test('rejects zero, negative, over 150, excessive decimals and malformed values', async () => {
    for (const value of [0, -1, 150.01, 9999, 1.234, '', null, true, {}, 'bad']) {
      assert.equal((await call('POST', '/4/weights', body(value))).status, 400, JSON.stringify(value));
    }
    assert.equal(rows.length, 0);
  });
  await t.test('accepts boundaries 0.01 and 150 on separate days', async () => {
    assert.equal((await call('POST', '/4/weights', body(0.01))).status, 201);
    assert.equal((await call('POST', '/4/weights', body(150, addDays(day, 1)))).status, 201);
  });
  await t.test('rejects future and impossible calendar dates', async () => {
    assert.equal((await call('POST', '/4/weights', body(8, tomorrow))).status, 400);
    assert.equal((await call('POST', '/4/weights', body(8, '2026-02-30'))).status, 400);
  });
  await t.test('today is valid and GET reports the server calendar day', async () => {
    const res = await call('POST', '/4/weights', body(8, todayString(), '23:59'));
    assert.equal(res.status, 201);
    const history = await call('GET', '/4/weights');
    assert.equal(history.body.today, todayString());
    assert.equal(history.body.data[0].measured_at, day + ' 08:00:00');
  });
  await t.test('different times on the same day conflict', async () => {
    const before = rows.length;
    const res = await call('POST', '/4/weights', body(9, day, '18:00'));
    assert.equal(res.status, 409); assert.match(res.body.message, /for this day/);
    assert.equal(rows.length, before);
  });
  await t.test('editing its own day or sending unchanged data is allowed', async () => {
    assert.equal((await call('PUT', '/4/weights/1', body(0.01))).status, 200);
    assert.equal((await call('PUT', '/4/weights/1', body(9, day, '12:00'))).status, 200);
    assert.equal(rows.find(row => row.id === 1).weight_kg, 9);
  });
  await t.test('editing into another occupied day conflicts and preserves the original', async () => {
    assert.equal((await call('PUT', '/4/weights/1', body(10, addDays(day, 1)))).status, 409);
    assert.equal(rows.find(row => row.id === 1).measured_at, day + ' 12:00:00');
    assert.equal((await call('PUT', '/4/weights/1', body(151))).status, 400);
    assert.equal((await call('PUT', '/4/weights/1', body(10, tomorrow))).status, 400);
  });
  await t.test('separate pets may use the same day', async () => {
    assert.equal((await call('POST', '/5/weights', body(12))).status, 201);
  });
  await t.test('simultaneous creates for the same pet/day allow exactly one', async () => {
    const date = addDays(day, 2);
    const responses = await Promise.all([call('POST', '/4/weights', body(8, date, '09:00')), call('POST', '/4/weights', body(9, date, '17:00'))]);
    assert.deepEqual(responses.map(res => res.status).sort(), [201, 409]);
    assert.equal(rows.filter(row => row.pet_id === 4 && row.measured_at.startsWith(date)).length, 1);
    assert.ok(statements.some(sql => /FROM pets.*FOR UPDATE/.test(sql)));
    assert.ok(statements.some(sql => /DATE_ADD/.test(sql) && /FOR UPDATE/.test(sql)));
  });
  await t.test('failed database writes roll back and release the connection', async () => {
    const before = rows.length, rollbackBefore = rollbacks, releaseBefore = releases;
    failWrite = true;
    assert.equal((await call('POST', '/4/weights', body(8, addDays(day, 3)))).status, 500);
    failWrite = false;
    assert.equal(rows.length, before); assert.equal(rollbacks, rollbackBefore + 1); assert.equal(releases, releaseBefore + 1);
  });
  await t.test('inactive pet is rechecked inside the transaction', async () => {
    active = false;
    await assert.rejects(service.createWeightLog(4, body(8)), { code: 'PET_NOT_FOUND' });
    active = true;
    assert.ok(commits > 0 && rollbacks > 0);
  });
});
