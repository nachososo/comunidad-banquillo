import test from 'node:test';
import assert from 'node:assert/strict';
import { readPasswordRecoveryCallback, requestPasswordRecovery, saveRecoveredPassword } from '../src/utils/passwordRecovery.js';

test('recognizes recovery and expired callbacks without retaining credentials', () => {
  assert.deepEqual(readPasswordRecoveryCallback('#type=recovery&access_token=secret&refresh_token=secret'), { requested: true, failed: false });
  assert.deepEqual(readPasswordRecoveryCallback('#error_code=otp_expired&error_description=Expired'), { requested: false, failed: true });
  assert.deepEqual(readPasswordRecoveryCallback('#type=signup'), { requested: false, failed: false });
});

test('normalizes the address and uses the configured authorized Site URL', async () => {
  let address;
  await requestPasswordRecovery({ resetPasswordForEmail: async (email) => { address = email; return {}; } }, ' USER@EXAMPLE.INVALID ');
  assert.equal(address, 'user@example.invalid');
  await assert.rejects(requestPasswordRecovery(null, address));
});

test('rejects short or mismatching passwords before updating any account', async () => {
  const auth = { updateUser: () => { throw new Error('Must not be called'); } };
  await assert.rejects(saveRecoveredPassword(auth, 'short', 'short'), /6 caracteres/);
  await assert.rejects(saveRecoveredPassword(auth, 'long-enough', 'different'), /no coinciden/);
  await assert.rejects(saveRecoveredPassword(null, 'long-enough', 'long-enough'), /nuevo enlace/);
});

test('does not report success when Supabase rejects an expired session or rate limit', async () => {
  const expired = new Error('Expired session');
  await assert.rejects(saveRecoveredPassword({ updateUser: async () => ({ error: expired }) }, 'long-enough', 'long-enough'), expired);
  const limited = new Error('Rate limit');
  await assert.rejects(requestPasswordRecovery({ resetPasswordForEmail: async () => ({ error: limited }) }, 'user@example.invalid'), limited);
});

test('updates only the password through the authenticated SDK', async () => {
  let attributes;
  await saveRecoveredPassword({ updateUser: async (value) => { attributes = value; return {}; } }, 'long-enough', 'long-enough');
  assert.deepEqual(attributes, { password: 'long-enough' });
});
