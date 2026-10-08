// app/(auth)/forgot-password/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import axios from 'axios'

// Turns whatever was thrown into a message we can show on screen.
// axios.isAxiosError() tells TypeScript "this really is an axios error",
// so we can safely read error.response.data.error WITHOUT using `any`.
// Anything else (a normal JS error) just gets the fallback message.
function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || fallback
  }
  return fallback
}

// ─────────────────────────────────────────────────────────────
// STYLES — copied from app/(auth)/signin/page.tsx so this page
// matches it exactly, as requested. If you ever pull these into a
// shared file (e.g. a <AuthStyles /> component both pages import),
// update both places at once.
// ─────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  .fp-display { font-family: 'Cormorant Garamond', Georgia, serif; }
  .fp-sans    { font-family: 'DM Sans', system-ui, sans-serif; }

  @keyframes fp-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fp-spin { to { transform: rotate(360deg); } }

  .fp-reveal              { animation: fp-in 0.4s ease both; opacity: 0; }
  .fp-reveal[data-d="1"] { animation-delay: 0.05s; }
  .fp-reveal[data-d="2"] { animation-delay: 0.12s; }
  .fp-reveal[data-d="3"] { animation-delay: 0.19s; }

  .fp-field {
    position: relative;
    border-radius: 8px;
    border: 1px solid #3f3f46;
    background: #0c0c0e;
    transition: border-color 0.18s ease;
  }
  .fp-field.is-focused { border-color: #71717a; }
  .fp-field.is-error   { border-color: rgba(239,68,68,0.5); }

  .fp-field::after {
    content: '';
    position: absolute;
    bottom: 0; left: 15%; right: 15%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(113,113,122,0.4), transparent);
    opacity: 0;
    transition: opacity 0.2s ease;
    border-radius: 0 0 8px 8px;
  }
  .fp-field.is-focused::after { opacity: 1; }

  .fp-spinner {
    width: 13px; height: 13px;
    border: 1.5px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: fp-spin 0.6s linear infinite;
    flex-shrink: 0;
  }
`

// ─────────────────────────────────────────────────────────────
// ICONS — same inline SVGs as the signin page
// ─────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

function FreeportLogo() {
  return <span className="fp-sans text-neutral-700 font-medium text-xl tracking-tight">Opprine</span>
}

// ─────────────────────────────────────────────────────────────
// VALIDATION — one schema per step, same react-hook-form +
// zodResolver pattern as signin/page.tsx and signup/page.jsx
// ─────────────────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email'),
})
type EmailFormData = z.infer<typeof emailSchema>

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})
type OtpFormData = z.infer<typeof otpSchema>

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type PasswordFormData = z.infer<typeof passwordSchema>

const RESEND_COOLDOWN_SECONDS = 60

// ─────────────────────────────────────────────────────────────
// PAGE
//
// One component, three steps, driven by a single `step` state
// value. Nothing about a step's data (email, the resetToken from
// step 2) ever touches localStorage/sessionStorage — it only ever
// lives in React state, so it disappears the moment the tab closes,
// same as it should for a one-time secret.
// ─────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const router = useRouter()

  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer for the resend button. Ticks every second while
  // cooldown > 0; the interval clears itself once it hits 0.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="fp-sans min-h-screen bg-neutral-50 flex">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-14">
          <div className="flex lg:hidden mb-10 fp-reveal" data-d="1">
            <FreeportLogo />
          </div>

          <div className="w-full max-w-[380px] space-y-7">
            {step === 'email' && (
              <EmailStep
                onSent={(sentEmail) => {
                  setEmail(sentEmail)
                  setCooldown(RESEND_COOLDOWN_SECONDS)
                  setStep('otp')
                }}
                serverError={serverError}
                setServerError={setServerError}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {step === 'otp' && (
              <OtpStep
                email={email}
                cooldown={cooldown}
                onVerified={(token) => {
                  setResetToken(token)
                  setServerError('')
                  setStep('password')
                }}
                onChangeEmail={() => {
                  setServerError('')
                  setStep('email')
                }}
                onResent={() => setCooldown(RESEND_COOLDOWN_SECONDS)}
                serverError={serverError}
                setServerError={setServerError}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {step === 'password' && (
              <PasswordStep
                email={email}
                resetToken={resetToken}
                onSuccess={() => {
                  router.push('/signin?message=' + encodeURIComponent('Password updated. Please sign in.'))
                }}
                serverError={serverError}
                setServerError={setServerError}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — enter email
// ─────────────────────────────────────────────────────────────
function EmailStep({ onSent, serverError, setServerError, isLoading, setIsLoading }: {
  onSent: (email: string) => void
  serverError: string
  setServerError: (s: string) => void
  isLoading: boolean
  setIsLoading: (b: boolean) => void
}) {
  const [focused, setFocused] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async (data: EmailFormData) => {
    setIsLoading(true)
    setServerError('')
    try {
      // The backend ALWAYS returns the same generic message here,
      // whether or not this email has an account — see
      // app/api/auth/forgot-password/route.ts. We move to the OTP
      // step regardless, exactly because the frontend has no way (and
      // shouldn't have a way) to know which case just happened.
      await axios.post('/api/auth/forgot-password', { email: data.email })
      onSent(data.email)
    } catch (error) {
      setServerError(getErrorMessage(error, 'Something went wrong. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="fp-reveal flex items-center flex-col" data-d="1">
        <h1 className="text-neutral-700 font-medium mb-2" style={{ fontSize: '2.25rem', letterSpacing: '-0.03em' }}>
          Forgot password?
        </h1>
        <p className="text-zinc-500 text-md text-center">
          Enter your email and we&apos;ll send you a code to reset it
        </p>
      </div>

      {serverError && (
        <div className="fp-reveal rounded-lg px-4 py-3 text-sm bg-red-500/[0.07] border border-red-500/20 text-red-400/90">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 fp-reveal" data-d="2">
        <div>
          <div className={`fp-field${focused ? ' is-focused' : ''}${errors.email ? ' is-error' : ''}`}>
            <input
              {...register('email')}
              type="email"
              autoFocus
              placeholder="Email Address"
              className="w-full bg-neutral-800 py-3 px-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              style={{ borderRadius: 8 }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </div>
          {errors.email && <p className="text-red-400/80 text-xs mt-1.5 pl-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-[8px] py-3.5 tracking-[0.015em] transition-colors duration-150 mt-1"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2"><span className="fp-spinner" />Sending code…</span>
          ) : 'Send code'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 fp-reveal" data-d="3">
        <Link href="/signin" className="text-zinc-500 hover:text-zinc-400 font-medium transition-colors duration-150 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — verify OTP
// ─────────────────────────────────────────────────────────────
function OtpStep({ email, cooldown, onVerified, onChangeEmail, onResent, serverError, setServerError, isLoading, setIsLoading }: {
  email: string
  cooldown: number
  onVerified: (resetToken: string) => void
  onChangeEmail: () => void
  onResent: () => void
  serverError: string
  setServerError: (s: string) => void
  isLoading: boolean
  setIsLoading: (b: boolean) => void
}) {
  const [focused, setFocused] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  })

  const onSubmit = async (data: OtpFormData) => {
    setIsLoading(true)
    setServerError('')
    try {
      const res = await axios.post('/api/auth/verify-reset-otp', { email, otp: data.otp })
      onVerified(res.data.resetToken)
    } catch (error) {
      setServerError(
        getErrorMessage(error, 'That code is invalid or has expired. Please request a new one.')
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return
    setIsResending(true)
    setServerError('')
    try {
      await axios.post('/api/auth/forgot-password', { email })
      onResent()
    } catch {
      setServerError('Could not resend the code. Please try again in a moment.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <div className="fp-reveal flex items-center flex-col" data-d="1">
        <h1 className="text-neutral-700 font-medium mb-2" style={{ fontSize: '2.25rem', letterSpacing: '-0.03em' }}>
          Enter your code
        </h1>
        <p className="text-zinc-500 text-md text-center">
          We sent a 6-digit code to <span className="text-zinc-400">{email}</span>
        </p>
      </div>

      {serverError && (
        <div className="fp-reveal rounded-lg px-4 py-3 text-sm bg-red-500/[0.07] border border-red-500/20 text-red-400/90">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 fp-reveal" data-d="2">
        <div>
          <div className={`fp-field${focused ? ' is-focused' : ''}${errors.otp ? ' is-error' : ''}`}>
            <input
              {...register('otp')}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              placeholder="000000"
              className="w-full bg-neutral-800 py-3 px-4 text-center text-lg tracking-[0.5em] text-zinc-100 outline-none placeholder:text-zinc-700 placeholder:tracking-[0.5em]"
              style={{ borderRadius: 8 }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </div>
          {errors.otp && <p className="text-red-400/80 text-xs mt-1.5 pl-1">{errors.otp.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-[8px] py-3.5 tracking-[0.015em] transition-colors duration-150 mt-1"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2"><span className="fp-spinner" />Verifying…</span>
          ) : 'Verify code'}
        </button>
      </form>

      <div className="flex items-center justify-between text-xs fp-reveal" data-d="3">
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
        >
          Change email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className="text-zinc-600 hover:text-zinc-400 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? 'Sending…' : 'Resend code'}
        </button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — set new password
// ─────────────────────────────────────────────────────────────
function PasswordStep({ email, resetToken, onSuccess, serverError, setServerError, isLoading, setIsLoading }: {
  email: string
  resetToken: string
  onSuccess: () => void
  serverError: string
  setServerError: (s: string) => void
  isLoading: boolean
  setIsLoading: (b: boolean) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [focusedField, setFocusedField] = useState<'password' | 'confirmPassword' | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true)
    setServerError('')
    try {
      await axios.post('/api/auth/reset-password', {
        email,
        resetToken,
        password: data.password,
      })
      onSuccess()
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          'This reset session is invalid or has expired. Please start over.'
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const fieldClass = (f: 'password' | 'confirmPassword') =>
    `fp-field${focusedField === f ? ' is-focused' : ''}${errors[f] ? ' is-error' : ''}`

  return (
    <>
      <div className="fp-reveal flex items-center flex-col" data-d="1">
        <h1 className="text-neutral-700 font-medium mb-2" style={{ fontSize: '2.25rem', letterSpacing: '-0.03em' }}>
          Set a new password
        </h1>
        <p className="text-zinc-500 text-md text-center">Choose a new password for your account</p>
      </div>

      {serverError && (
        <div className="fp-reveal rounded-lg px-4 py-3 text-sm bg-red-500/[0.07] border border-red-500/20 text-red-400/90">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 fp-reveal" data-d="2">
        <div>
          <div className={fieldClass('password')}>
            <div className="relative flex items-center">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="New password"
                className="w-full bg-neutral-800 py-3 px-4 pr-11 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                style={{ borderRadius: 8 }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-150 focus:outline-none"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {errors.password && <p className="text-red-400/80 text-xs mt-1.5 pl-1">{errors.password.message}</p>}
        </div>

        <div>
          <div className={fieldClass('confirmPassword')}>
            <div className="relative flex items-center">
              <input
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                className="w-full bg-neutral-800 py-3 px-4 pr-11 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                style={{ borderRadius: 8 }}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-150 focus:outline-none"
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {errors.confirmPassword && <p className="text-red-400/80 text-xs mt-1.5 pl-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-[8px] py-3.5 tracking-[0.015em] transition-colors duration-150 mt-1"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2"><span className="fp-spinner" />Updating…</span>
          ) : 'Reset password'}
        </button>
      </form>
    </>
  )
}