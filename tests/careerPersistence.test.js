import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareerRepository } from '../src/lib/careerPersistence.js';
import { DEFAULT_CAREER_CONFIG as CONFIG } from '../src/data/careerData.js';

function clientMock() {
  const state = { rows: [], calls: [], user: { id: 'u1' }, authCalls: 0, failRead: false, loseResponse: false, isAdmin: true };
  class Query {
    constructor(table) { this.filters = []; this.operation = 'read'; this.table = table; }
    select() { return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    update(row) { this.operation = 'update'; this.row = row; return this; }
    insert(row) { this.operation = 'insert'; this.row = row; return this; }
    single() { return this.run(true); }
    maybeSingle() { return this.run(false); }
    async run(strict) {
      const found = state.rows.find((row) => this.filters.every(([key, value]) => row[key] === value));
      if (this.operation === 'read') return state.failRead ? { error: { code: 'network' } } : { data: found ? structuredClone(found) : null, error: null };
      if (!state.isAdmin) return { error: { code: '42501' } };
      if (this.operation === 'insert') {
        if (state.rows.some((row) => row.key === this.row.key)) return { error: { code: '23505' } };
        state.rows.push(structuredClone(this.row));
      } else if (found) Object.assign(found, structuredClone(this.row));
      else if (strict) return { error: { code: 'PGRST116' } };
      if (state.loseResponse) { state.loseResponse = false; return { error: { code: 'network' } }; }
      return { data: structuredClone(this.row), error: null };
    }
  }
  return { state, from: (table) => { state.calls.push(table); return new Query(table); }, auth: { getUser: async () => { state.authCalls++; return { data: { user: state.user }, error: null }; } } };
}
test('el visitante carga eventos sin consultar sesión ni datos de jugadores', async () => {
  const client = clientMock(), repo = createCareerRepository(client);
  client.state.user = null;
  assert.equal((await repo.loadConfig()).data.version, 2);
  assert.equal(client.state.authCalls, 0);
  assert.deepEqual(client.state.calls, ['game_data']);
  assert.equal(repo.saveCareer, undefined); assert.equal(repo.loadCareer, undefined);
});
test('catálogo vacío publicado se respeta sin restaurar el inicial', async () => {
  const client = clientMock(), repo = createCareerRepository(client);
  await repo.saveConfig({ ...CONFIG, events: [], saveToken: 'empty' }, null);
  assert.equal((await repo.loadConfig()).data.events.length, 0);
});
test('solo admin publica; usuarios y visitantes no pueden hacerlo', async () => {
  const client = clientMock(), repo = createCareerRepository(client);
  client.state.isAdmin = false;
  await assert.rejects(repo.saveConfig({ ...CONFIG, saveToken: 'member' }, null), /administración/);
  client.state.user = null;
  await assert.rejects(repo.saveConfig(CONFIG, null), /entrar/);
  assert.equal(client.state.rows.length, 0);
});
test('errores de lectura se notifican, no se sobrescribe contenido', async () => {
  const client = clientMock(), repo = createCareerRepository(client); client.state.failRead = true;
  await assert.rejects(repo.loadConfig()); assert.equal(client.state.rows.length, 0);
});
test('protege publicaciones frente a conflictos entre pestañas', async () => {
  const client = clientMock(), repo = createCareerRepository(client);
  await repo.saveConfig({ ...CONFIG, saveToken: 'first' }, null);
  await assert.rejects(repo.saveConfig({ ...CONFIG, saveToken: 'other' }, '2000-01-01T00:00:00.000Z'), /pestaña/);
  assert.equal(client.state.rows[0].payload.saveToken, 'first');
});
test('recupera publicación cuya respuesta se perdió sin duplicar', async () => {
  const client = clientMock(), repo = createCareerRepository(client); client.state.loseResponse = true;
  const saved = await repo.saveConfig({ ...CONFIG, saveToken: 'first' }, null);
  assert.equal(saved.data.saveToken, 'first'); assert.equal(client.state.rows.length, 1);
});
test('sin servidor se puede leer catálogo base, pero no publicar cambios', async () => {
  const repo = createCareerRepository(null, false);
  assert.equal((await repo.loadConfig()).data.version, 2);
  await assert.rejects(repo.saveConfig(CONFIG, null), /Supabase/);
});
