// lib/encryption.js
import crypto from 'crypto'

// Step A: Load and validate the key
const KEY = process.env.BANK_ENCRYPTION_KEY

if (!KEY || Buffer.from(KEY, 'hex').length !== 32) {
  throw new Error(
    'BANK_ENCRYPTION_KEY must be set in .env as a 64-character hex string (32 bytes)'
  )
}

const KEY_BUFFER = Buffer.from(KEY, 'hex')
const ALGORITHM = 'aes-256-gcm'

// Step B: Encrypt

export function encrypt(plainText) {
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// Step C: Decrypt
export function decrypt(encryptedString) {
  const [ivHex, authTagHex, encryptedHex] = encryptedString.split(':')

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Malformed encrypted value — cannot decrypt')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// Step D: A small helper just for the "last 4 digits" field ──────────

export function lastFour(accountNumber) {
  return accountNumber.slice(-4)
}