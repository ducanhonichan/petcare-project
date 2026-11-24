const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const queries = [];
const poolPath = require.resolve('../src/config/db');
require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: {
  query: async (sql, params) => {
    if (sql.startsWith('SELECT id, role, is_banned FROM users')) {
      return [[{ id: params[0], role: 'USER', is_banned: 0 }]];
    }
    queries.push({ sql, params });
    if (sql.startsWith('UPDATE')) return [{ affectedRows: 1 }];
    if (sql.includes('totalPets')) return [[{ totalPets: '2', totalWeights: '3', totalVisits: '4' }]];
    return [[{ kind: 'visit', id: 7, pet_id: 4, pet_name: 'Milo', detail: 'Check-up', record_date: '2026-11-20' }]];
  },
} };
const jwtPath = require.resolve('../src/config/jwt');
require.cache[jwtPath] = { id: jwtPath, filename: jwtPath, loaded: true, exports: { secret: 'test-only-secret' } };
const photos = require('../src/services/petPhotos.service');
const signature = photos.photoFormat;
let configured = true, failUpload = false, failSave = false, missingOnSave = false;
let uploads = 0, discards = 0, updates = [];
photos.isPhotoStorageConfigured = () => configured;
photos.uploadPetPhoto = async () => {
  uploads++;
  if (failUpload) throw new Error('Mock storage failure');
  return { url: 'https://example.com/milo.jpg', publicId: 'mock-photo' };
};
photos.discardPetPhoto = async () => { discards++; };
const pets = require('../src/services/pets.service');
const realUpdate = pets.updatePetAvatar;
pets.getPetById = async (petId, userId) => petId === 4 && userId === 1 ? { id: 4 } : null;
pets.updatePetAvatar = async (...args) => {
  updates.push(args);
  if (failSave) throw new Error('Mock DB failure');
  return !missingOnSave;
};
const app = express();
app.use('/api/pets', require('../src/routes/petPhotos.routes'));
app.use('/api/dashboard', require('../src/routes/dashboard.routes'));
const token = jwt.sign({ id: 1, role: 'USER' }, 'test-only-secret');
const headers = { Authorization: 'Bearer ' + token };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4uoAAAAASUVORK5CYII=', 'base64');

test('Dashboard and photo API regression', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function upload(id = 4, data = png, auth = headers, type = 'image/png', field = 'photo') {
    const body = new FormData();
    if (data !== null) body.append(field, new Blob([data], { type }), 'photo.png');
    return fetch(base + '/api/pets/' + id + '/photo', { method: 'POST', headers: auth, body });
  }
  await t.test('anonymous requests cannot read dashboard or upload', async () => {
    assert.equal((await fetch(base + '/api/dashboard')).status, 401);
    assert.equal((await upload(4, png, {})).status, 401);
    assert.equal(uploads, 0);
  });
  await t.test('dashboard scopes all tables to active owned pets and returns numeric counts', async () => {
    const response = await fetch(base + '/api/dashboard', { headers });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.summary, { totalPets: 2, totalWeights: 3, totalVisits: 4 });
    assert.equal(body.activities[0].record_date, '2026-11-20');
    assert.equal(queries.length, 2);
    for (const { sql, params } of queries) {
      assert.deepEqual(params, [1, 1, 1]);
      assert.equal((sql.match(/is_active = TRUE/g) || []).length, 3);
    }
    assert.match(queries[1].sql, /ORDER BY recorded_at DESC, kind ASC, id DESC LIMIT 8/);
  });
  await t.test('invalid or inaccessible pet is rejected before storage', async () => {
    assert.equal((await upload('bad')).status, 400);
    assert.equal((await upload(999)).status, 404);
    const otherToken = jwt.sign({ id: 2 }, 'test-only-secret');
    assert.equal((await upload(4, png, { Authorization: 'Bearer ' + otherToken })).status, 404);
    assert.equal(uploads, 0);
  });
  await t.test('missing cloud configuration returns an explicit message', async () => {
    configured = false;
    assert.equal((await upload()).status, 503);
    configured = true;
  });
  await t.test('missing file, wrong field and spoofed image contents are rejected', async () => {
    assert.equal((await upload(4, null)).status, 400);
    assert.equal((await upload(4, png, headers, 'image/png', 'wrong')).status, 400);
    assert.equal((await upload(4, Buffer.from('<svg></svg>'))).status, 400);
    assert.equal(uploads, 0);
  });
  await t.test('files larger than 5 MB are rejected', async () => {
    assert.equal((await upload(4, Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
    assert.equal(uploads, 0);
  });
  await t.test('valid image persists only the owned pet avatar', async () => {
    const response = await upload();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).avatar_url, 'https://example.com/milo.jpg');
    assert.deepEqual(updates, [[4, 1, 'https://example.com/milo.jpg']]);
  });
  await t.test('provider failure keeps the existing avatar', async () => {
    failUpload = true;
    assert.equal((await upload()).status, 502);
    assert.equal(updates.length, 1);
    failUpload = false;
  });
  await t.test('failed database update cleans up newly uploaded asset', async () => {
    failSave = true;
    assert.equal((await upload()).status, 502);
    assert.equal(discards, 1);
    failSave = false;
  });
  await t.test('pet deleted during upload does not retain new asset', async () => {
    missingOnSave = true;
    assert.equal((await upload()).status, 404);
    assert.equal(discards, 2);
    missingOnSave = false;
  });
  await t.test('avatar update SQL does not overwrite other pet fields', async () => {
    assert.equal(await realUpdate(4, 1, 'https://example.com/photo.jpg'), true);
    const query = queries.at(-1);
    assert.match(query.sql, /SET avatar_url = \? WHERE id = \? AND user_id = \? AND is_active = TRUE/);
    assert.deepEqual(query.params, ['https://example.com/photo.jpg', 4, 1]);
  });
  await t.test('file signatures allow only supported raster formats', () => {
    assert.equal(signature(png), 'png');
    assert.equal(signature(Buffer.from([255,216,255,224])), 'jpg');
    assert.equal(signature(Buffer.from('RIFF0000WEBP')), 'webp');
    assert.equal(signature(Buffer.from('GIF89a')), null);
    assert.equal(signature(Buffer.alloc(0)), null);
  });
});
