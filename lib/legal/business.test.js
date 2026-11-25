// lib/legal/business.test.js
//
// Run with:  node --test lib/legal/business.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { getBusinessDetails } from './business.js'

const complete = {
  LEGAL_BUSINESS_NAME: 'Example Studio',
  LEGAL_BUSINESS_ADDRESS: '1 Example Road, Pune, India',
  LEGAL_SUPPORT_EMAIL: 'support@example.com',
}

test('returns the configured business details', () => {
  assert.deepEqual(getBusinessDetails(complete), {
    name: 'Example Studio',
    address: '1 Example Road, Pune, India',
    supportEmail: 'support@example.com',
  })
})

test('refuses to render with any detail missing or blank', () => {
  assert.throws(() => getBusinessDetails({}), /LEGAL_BUSINESS_NAME, LEGAL_BUSINESS_ADDRESS, LEGAL_SUPPORT_EMAIL/)
  assert.throws(() => getBusinessDetails({ ...complete, LEGAL_SUPPORT_EMAIL: '  ' }), /LEGAL_SUPPORT_EMAIL/)
})
