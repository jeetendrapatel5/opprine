// lib/legal/business.js
//
// Business identity shown on the legal pages. Read from the environment so
// the entity name, address and contact are set per deployment. Throws when
// a value is missing: a legal page without them must not be published.

const REQUIRED = {
  name: 'LEGAL_BUSINESS_NAME',
  address: 'LEGAL_BUSINESS_ADDRESS',
  supportEmail: 'LEGAL_SUPPORT_EMAIL',
}

export function getBusinessDetails(env = process.env) {
  const details = {}
  const missing = []
  for (const [field, variable] of Object.entries(REQUIRED)) {
    const value = env[variable]?.trim()
    if (value) details[field] = value
    else missing.push(variable)
  }
  if (missing.length > 0) {
    throw new Error(`Missing legal page configuration: ${missing.join(', ')}`)
  }
  return details
}
