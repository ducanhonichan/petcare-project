const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

// In-memory fake database
const db = {
  users: [
    { id: 1, name: 'Admin', email: 'admin@petcare.com', role: 'ADMIN', is_banned: 0, created_at: '2026-01-01', pet_count: 0 },
    { id: 2, name: 'Demo', email: 'demo@petcare.com', role: 'USER', is_banned: 0, created_at: '2026-01-02', pet_count: 3 },
  ],
  species: [{ id: 1, name: 'Dog' }, { id: 4, name: 'Rabbit' }],
  types: [
    { id: 10, name: 'Rabies - Dog', species_id: 1, species_name: 'Dog', interval_days: 365, description: null, is_active: 1 },
  ],
};
let nextTypeId = 11;

const poolPath = require.resolve('../src/config/db');
require.cache[poolPath] = {
  id: poolPath, filename: poolPath, loaded: true,
  exports: {
    query: async (sql, p = []) => {
      const q = sql.replace(/\s+/g, ' ').trim();
      // requireAuth (when it re-checks the account in the database)
      if (q.startsWith('SELECT id, role, is_banned FROM users')) {
        const u = db.users.find((x) => x.id === p[0]);
        return [u ? [u] : []];
      }
      if (q.includes('FROM users u')) return [db.users];
      if (q.startsWith('SELECT id, name, email, role, is_banned FROM users')) {
        const u = db.users.find((x) => x.id === p[0]);
        return [u ? [u] : []];
      }
      if (q.startsWith('UPDATE users SET is_banned')) {
        db.users.find((x) => x.id === p[1]).is_banned = p[0] ? 1 : 0;
        return [{ affectedRows: 1 }];
      }
      if (q.startsWith('SELECT id FROM species')) {
        return [db.species.filter((s) => s.id === p[0])];
      }
      if (q.includes('FROM vaccine_types vt') && q.includes('WHERE vt.id')) {
        return [db.types.filter((t) => t.id === p[0])];
      }
      if (q.includes('FROM vaccine_types vt')) return [db.types];
      if (q.startsWith('INSERT INTO vaccine_types')) {
        const sp = db.species.find((s) => s.id === p[1]);
        db.types.push({ id: nextTypeId, name: p[0], species_id: p[1], species_name: sp.name, interval_days: p[2], description: p[3], is_active: 1 });
        return [{ insertId: nextTypeId++ }];
      }
      if (q.startsWith('UPDATE vaccine_types SET name')) {
        const t = db.types.find((x) => x.id === p[5]);
        Object.assign(t, { name: p[0], species_id: p[1], interval_days: p[2], description: p[3], is_active: p[4] ? 1 : 0 });
        return [{ affectedRows: 1 }];
      }
      if (q.startsWith('UPDATE vaccine_types SET is_active = FALSE')) {
        db.types.find((x) => x.id === p[0]).is_active = 0;
        return [{ affectedRows: 1 }];
      }
      throw new Error('Unexpected query: ' + q);
    },
  },
};
const jwtPath = require.resolve('../src/config/jwt');
require.cache[jwtPath] = { id: jwtPath, filename: jwtPath, loaded: true, exports: { secret: 'test-only-secret' } };

const app = express();
app.use(express.json());
app.use('/api/admin', require('../src/routes/admin.routes'));
app.use((err, req, res, next) => res.status(500).json({ message: 'Internal server error' }));

let server, base;
const tokenFor = (id, role) => ({
  Authorization: 'Bearer ' + jwt.sign({ id, role }, 'test-only-secret'),
  'Content-Type': 'application/json',
});
const admin = tokenFor(1, 'ADMIN');
const user = tokenFor(2, 'USER');
const call = async (method, path, headers, body) => {
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
};

test('admin API', async (t) => {
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api/admin`;
  t.after(() => server.close());

  await t.test('needs a token and the ADMIN role', async () => {
    assert.equal((await call('GET', '/users', {})).status, 401);
    assert.equal((await call('GET', '/users', user)).status, 403);
    assert.equal((await call('GET', '/vaccine-types', user)).status, 403);
    assert.equal((await call('PUT', '/users/2/status', user, { is_banned: true })).status, 403);
  });

  await t.test('lists users', async () => {
    const res = await call('GET', '/users', admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.equal(res.body[1].is_banned, false);
    assert.equal(res.body[1].pet_count, 3);
  });

  await t.test('bans and unbans a user', async () => {
    assert.equal((await call('PUT', '/users/2/status', admin, { is_banned: 'yes' })).status, 400);
    assert.equal((await call('PUT', '/users/abc/status', admin, { is_banned: true })).status, 400);
    assert.equal((await call('PUT', '/users/99/status', admin, { is_banned: true })).status, 404);
    const banned = await call('PUT', '/users/2/status', admin, { is_banned: true });
    assert.equal(banned.status, 200);
    assert.equal(banned.body.user.is_banned, true);
    const unbanned = await call('PUT', '/users/2/status', admin, { is_banned: false });
    assert.equal(unbanned.body.user.is_banned, false);
  });

  await t.test('does not let an admin ban an admin', async () => {
    const res = await call('PUT', '/users/1/status', admin, { is_banned: true });
    assert.equal(res.status, 400);
    assert.equal(db.users[0].is_banned, 0);
  });

  await t.test('creates a vaccine type', async () => {
    assert.equal((await call('POST', '/vaccine-types', admin, { name: '', species_id: 4 })).status, 400);
    assert.equal((await call('POST', '/vaccine-types', admin, { name: 'X', species_id: 99 })).status, 400);
    assert.equal((await call('POST', '/vaccine-types', admin, { name: 'X', species_id: 4, interval_days: 0 })).status, 400);
    assert.equal((await call('POST', '/vaccine-types', admin, { name: 'X', species_id: 4, interval_days: 1.5 })).status, 400);
    const res = await call('POST', '/vaccine-types', admin, { name: ' Myxomatosis ', species_id: 4, interval_days: 180 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Myxomatosis');
    assert.equal(res.body.data.species_name, 'Rabbit');
    assert.equal(res.body.data.is_active, true);
  });

  await t.test('updates, hides and shows a vaccine type', async () => {
    assert.equal((await call('PUT', '/vaccine-types/999', admin, { name: 'X', species_id: 1 })).status, 404);
    const edit = await call('PUT', '/vaccine-types/10', admin, { name: 'Rabies', species_id: 1, interval_days: null });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.data.name, 'Rabies');
    assert.equal(edit.body.data.interval_days, null);

    const hide = await call('DELETE', '/vaccine-types/10', admin);
    assert.equal(hide.status, 200);
    const list = await call('GET', '/vaccine-types', admin);
    assert.equal(list.body.find((x) => x.id === 10).is_active, false);

    const show = await call('PUT', '/vaccine-types/10', admin, { name: 'Rabies', species_id: 1, is_active: true });
    assert.equal(show.body.data.is_active, true);
    assert.equal((await call('DELETE', '/vaccine-types/999', admin)).status, 404);
  });
});
