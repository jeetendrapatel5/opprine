// lib/billing/razorpay.js

import Razorpay from 'razorpay'

const globalForRazorpay = globalThis

function createRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.'
    )
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

export const razorpay = globalForRazorpay.razorpay ?? createRazorpayClient()

if (process.env.NODE_ENV !== 'production') globalForRazorpay.razorpay = razorpay

export default razorpay