/**
 * Identity trust-boundary tests (no network).
 * Run: node --test services/auth-service/test/resolveRequester.test.cjs
 */
// Force a known value so an ambient INTERNAL_API_SECRET cannot break the suite.
process.env.INTERNAL_API_SECRET = 'unit-test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isGatewayVouched,
  parseUserContextHeader,
  extractBearerToken,
  resolveRequester,
  STRICT_IDENTITY,
} = require('../lib/resolveRequester');

const mkReq = (headers = {}) => ({
  headers,
  get(name) {
    const key = String(name).toLowerCase();
    return this.headers[key] ?? this.headers[name];
  },
});

test('STRICT_IDENTITY is on when INTERNAL_API_SECRET is set', () => {
  assert.equal(STRICT_IDENTITY, true);
});

test('isGatewayVouched: only the exact secret vouches', () => {
  assert.equal(isGatewayVouched(mkReq({ 'x-internal-auth': 'unit-test-secret' })), true);
  assert.equal(isGatewayVouched(mkReq({ 'x-internal-auth': 'wrong' })), false);
  assert.equal(isGatewayVouched(mkReq({})), false);
  assert.equal(isGatewayVouched(mkReq({ 'x-internal-auth': '' })), false);
});

test('parseUserContextHeader needs a uid', () => {
  assert.equal(parseUserContextHeader(mkReq({ 'x-user-context': '{"role":"super_admin"}' })), null);
  assert.deepEqual(
    parseUserContextHeader(mkReq({ 'x-user-context': '{"uid":"u1","role":"manager"}' })),
    { uid: 'u1', role: 'manager' }
  );
  assert.equal(parseUserContextHeader(mkReq({ 'x-user-context': 'not json' })), null);
});

test('extractBearerToken', () => {
  assert.equal(extractBearerToken(mkReq({ authorization: 'Bearer abc.def.ghi' })), 'abc.def.ghi');
  assert.equal(extractBearerToken(mkReq({ authorization: 'Basic xyz' })), null);
  assert.equal(extractBearerToken(mkReq({})), null);
});

test('resolveRequester: forged X-User-Context with no vouch and no token is REJECTED', async () => {
  const req = mkReq({ 'x-user-context': '{"uid":"attacker","role":"super_admin","company_id":"victim"}' });
  assert.equal(await resolveRequester(req), null);
});

test('resolveRequester: gateway-vouched context is trusted verbatim', async () => {
  const req = mkReq({
    'x-internal-auth': 'unit-test-secret',
    'x-user-context': '{"uid":"u9","role":"manager","company_id":"c1"}',
  });
  const id = await resolveRequester(req);
  assert.equal(id.uid, 'u9');
  assert.equal(id.role, 'manager');
  assert.equal(id._source, 'gateway');
});

test('resolveRequester: no credentials at all -> null', async () => {
  assert.equal(await resolveRequester(mkReq({})), null);
});
