// Access policy — unit tests for the email-verification gate
// Uses Node.js built-in test runner (node:test) — no Firebase project or credentials needed.
// Policies are passed explicitly so the env-derived allow list does not matter here.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  identityRejection,
  isEmailAllowed,
  isIdentityAllowed,
  requiresEmailVerification,
} from '../lib/auth/firebase.mjs';

const open = { emails: [], domains: [] };
const byEmail = { emails: ['ops@crucix.live'], domains: [] };
const byDomain = { emails: [], domains: ['crucix.live'] };

const token = (overrides = {}) => ({
  uid: 'u1',
  email: 'ops@crucix.live',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
  ...overrides,
});
const passwordToken = (verified) =>
  token({ email_verified: verified, firebase: { sign_in_provider: 'password' } });

// ─── Unit Tests ───

describe('isEmailAllowed', () => {
  it('admits everyone when no allow list is configured', () => {
    assert.equal(isEmailAllowed('anyone@example.com', open), true);
    assert.equal(isEmailAllowed('', open), true);
  });

  it('matches emails and domains case-insensitively', () => {
    assert.equal(isEmailAllowed('OPS@Crucix.live', byEmail), true);
    assert.equal(isEmailAllowed('other@crucix.live', byEmail), false);
    assert.equal(isEmailAllowed('Other@CRUCIX.LIVE', byDomain), true);
    assert.equal(isEmailAllowed('other@example.com', byDomain), false);
  });
});

describe('requiresEmailVerification', () => {
  it('never requires verification when no allow list is configured', () => {
    assert.equal(requiresEmailVerification(passwordToken(false), open), false);
    assert.equal(requiresEmailVerification(passwordToken(undefined), open), false);
  });

  it('requires verification for unverified password accounts under an allow list', () => {
    assert.equal(requiresEmailVerification(passwordToken(false), byEmail), true);
    assert.equal(requiresEmailVerification(passwordToken(undefined), byDomain), true);
    assert.equal(requiresEmailVerification(passwordToken('true'), byEmail), true, 'must be boolean true');
  });

  it('is satisfied by a verified password account', () => {
    assert.equal(requiresEmailVerification(passwordToken(true), byEmail), false);
  });

  it('does not apply to federated providers', () => {
    const google = token({ email_verified: false, firebase: { sign_in_provider: 'google.com' } });
    const apple = token({ email_verified: false, firebase: { sign_in_provider: 'apple.com' } });
    assert.equal(requiresEmailVerification(google, byEmail), false);
    assert.equal(requiresEmailVerification(apple, byDomain), false);
  });

  it('tolerates tokens with no firebase claim block', () => {
    assert.equal(requiresEmailVerification(token({ firebase: undefined }), byEmail), false);
    assert.equal(requiresEmailVerification(null, byEmail), false);
  });
});

describe('identityRejection / isIdentityAllowed', () => {
  it('rejects a token without an email with 400', () => {
    assert.deepEqual(identityRejection(token({ email: undefined }), open), {
      code: 'no-email', status: 400, error: 'Account has no email',
    });
    assert.equal(isIdentityAllowed(token({ email: '' }), open), false);
  });

  it('admits any emailed identity when no allow list is configured', () => {
    assert.equal(identityRejection(passwordToken(false), open), null);
    assert.equal(isIdentityAllowed(token({ email: 'stranger@example.com' }), open), true);
  });

  it('rejects an address outside the allow list with 403', () => {
    const rejection = identityRejection(token({ email: 'stranger@example.com' }), byDomain);
    assert.equal(rejection.code, 'not-allowed');
    assert.equal(rejection.status, 403);
    assert.equal(isIdentityAllowed(token({ email: 'stranger@example.com' }), byEmail), false);
  });

  it('rejects an unverified password account that claims an allowed address with 403', () => {
    assert.deepEqual(identityRejection(passwordToken(false), byEmail), {
      code: 'unverified', status: 403, error: 'Verify your email address first',
    });
    assert.deepEqual(identityRejection(passwordToken(undefined), byDomain), {
      code: 'unverified', status: 403, error: 'Verify your email address first',
    });
    assert.equal(isIdentityAllowed(passwordToken(false), byDomain), false);
  });

  it('checks the allow list before verification status', () => {
    const outsider = token({ email: 'stranger@example.com', email_verified: false, firebase: { sign_in_provider: 'password' } });
    assert.equal(identityRejection(outsider, byEmail).code, 'not-allowed');
  });

  it('admits verified password accounts and federated accounts on the allow list', () => {
    assert.equal(identityRejection(passwordToken(true), byEmail), null);
    assert.equal(isIdentityAllowed(passwordToken(true), byDomain), true);
    assert.equal(isIdentityAllowed(token(), byEmail), true);
    assert.equal(isIdentityAllowed(token({ email_verified: false }), byDomain), true, 'google.com is trusted');
  });
});
