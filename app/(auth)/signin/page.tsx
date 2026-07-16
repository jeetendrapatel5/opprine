// app/(auth)/signin/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSession }                    from 'next-auth/react'
import { useForm }                       from 'react-hook-form'
import { zodResolver }                   from '@hookform/resolvers/zod'
import { z }                             from 'zod'
import { signIn }                        from 'next-auth/react'
import { useRouter, useSearchParams }    from 'next/navigation'
import Link                              from 'next/link'

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type LoginFormData = z.infer<typeof loginSchema>

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STATS = [
  { value: '2,400+', label: 'Freelancers' },
  { value: '₹48Cr+', label: 'Invoiced'   },
  { value: '4.9★',   label: 'Avg. Rating' },
]

// ─────────────────────────────────────────────────────────────
// STYLES
// Only CSS that Tailwind cannot express:
//   - @keyframes definitions
//   - Font utility classes via CSS variables
//   - Floating label transitions driven by React state
//   - Input wrapper :focus-within glow line
//   - Loading spinner ring
// Everything structural uses Tailwind in JSX below.
// ─────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  .fp-display { font-family: 'Cormorant Garamond', Georgia, serif; }
  .fp-sans    { font-family: 'DM Sans', system-ui, sans-serif; }

  /* Page-load reveals — clean opacity + tiny lift, no bounce */
  @keyframes fp-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fp-spin {
    to { transform: rotate(360deg); }
  }

  .fp-reveal              { animation: fp-in 0.4s ease both; opacity: 0; }
  .fp-reveal[data-d="1"] { animation-delay: 0.05s; }
  .fp-reveal[data-d="2"] { animation-delay: 0.12s; }
  .fp-reveal[data-d="3"] { animation-delay: 0.19s; }
  .fp-reveal[data-d="4"] { animation-delay: 0.26s; }
  .fp-reveal[data-d="5"] { animation-delay: 0.33s; }

  /* Input wrapper — border state handled via JS className */
  .fp-field {
    position: relative;
    border-radius: 8px;
    border: 1px solid #3f3f46;
    background: #0c0c0e;
    transition: border-color 0.18s ease;
  }
  .fp-field.is-focused { border-color: #71717a; }
  .fp-field.is-error   { border-color: rgba(239,68,68,0.5); }

  /* Bottom glow line on focus — very subtle */
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

  /* Spinner ring */
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
// ICONS — inline SVG, no icon-library dependency
// ─────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ─────────────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────────────
function FreeportLogo() {
  return (
      <span className="fp-sans text-neutral-700 font-medium text-xl tracking-tight">
        Opprine
      </span>
  )
}

// ─────────────────────────────────────────────────────────────
// SIGNIN FORM
// ─────────────────────────────────────────────────────────────
function SigninForm() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { status }    = useSession()
  const successMessage = searchParams.get('message')

  const [loginError,   setLoginError]   = useState('')
  const [isLoading,    setIsLoading]    = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const emailValue    = watch('email',    '')
  const passwordValue = watch('password', '')

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard')
  }, [status, router])

  if (status === 'loading' || status === 'authenticated') return null

  // Whether the floating label should be in its small/top position
  const isFloat = (f: 'email' | 'password') =>
    focusedField === f || (f === 'email' ? !!emailValue : !!passwordValue)

  // Floating label style — position driven by React state
  const labelStyle = (f: 'email' | 'password'): React.CSSProperties => ({
    position:      'absolute',
    left:          '1rem',
    pointerEvents: 'none',
    transition:    'all 0.18s ease',
    fontWeight:    isFloat(f) ? 600         : 400,
    top:           isFloat(f) ? '-15px'       : '50%',
    transform:     isFloat(f) ? 'none'      : 'translateY(-50%)',
    fontSize:      isFloat(f) ? '0.600rem'  : '0.875rem',
    letterSpacing: isFloat(f) ? '0.1em'     : '0',
    textTransform: isFloat(f) ? 'uppercase' : 'none',
    color: focusedField === f
      ? 'rgb(64, 64, 64)'   // zinc-400 — focused
      : isFloat(f)
        ? 'rgba(113,113,122,0.8)'  // zinc-500 — has value, not focused
        : 'rgb(229, 229, 229)',// zinc-500 dimmed — empty and resting
  } as React.CSSProperties)

  // Field wrapper class — border state from React state
  const fieldClass = (f: 'email' | 'password') => {
    const isFocus = focusedField === f
    const hasErr  = f === 'email' ? !!errors.email : !!errors.password
    return `fp-field${isFocus ? ' is-focused' : ''}${hasErr ? ' is-error' : ''}`
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setLoginError('')
    const result = await signIn('credentials', {
      email:    data.email,
      password: data.password,
      redirect: false,
    })
    setIsLoading(false)
    if (result?.error) {
      setLoginError('Invalid email or password. Please try again.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/*
        PAGE ROOT
        ─────────
        Deep zinc-950 background — cleaner than #07070f
        No grain, no cursor glow, no fixed overlays
      */}
      <div className="fp-sans min-h-screen bg-neutral-50 flex">
        {/* ══════════════════════════════════════════
            RIGHT PANEL — sign-in form
        ══════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-14">

          {/* Mobile-only logo */}
          <div className="flex lg:hidden mb-10 fp-reveal" data-d="1">
            <FreeportLogo />
          </div>

          <div className="w-full max-w-[380px] space-y-7">

            {/* Heading */}
            <div className="fp-reveal flex items-center flex-col" data-d="1">
              <h1
                className="text-neutral-700 font-[poppins] font-medium mb-2"
                style={{ fontSize: '2.25rem', letterSpacing: '-0.030em' }}
              >
                Welcome Back
              </h1>
              <p className="text-zinc-500 text-md">
                Sign in to continue to your workspace
              </p>
            </div>

            {/* Success banner */}
            {successMessage && (
              <div className="fp-reveal rounded-lg px-4 py-3 text-sm bg-emerald-500/[0.07] border border-emerald-500/20 text-emerald-400/90">
                {successMessage}
              </div>
            )}

            {/* Error banner */}
            {loginError && (
              <div className="fp-reveal rounded-lg px-4 py-3 text-sm bg-red-500/[0.07] border border-red-500/20 text-red-400/90">
                {loginError}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 fp-reveal"
              data-d="2"
            >

              {/* ── Email field ── */}
              <div>
                <div className={fieldClass('email')}>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full bg-neutral-800 py-3 px-4 text-sm text-zinc-100 outline-none placeholder:opacity-0"
                    style={{ borderRadius: 8 }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={()  => setFocusedField(null)}
                  />
                  <label style={labelStyle('email')}>
                    Email Address
                  </label>
                </div>
                {errors.email && (
                  <p className="text-red-400/80 text-xs mt-1.5 pl-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* ── Password field ── */}
              <div>
                <div className={fieldClass('password')}>
                  <div className="relative flex items-center">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-neutral-800 py-3 px-4 pr-11 text-sm text-zinc-100 outline-none placeholder:opacity-0"
                      style={{ borderRadius: 8 }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={()  => setFocusedField(null)}
                    />
                    <label style={labelStyle('password')}>
                      Password
                    </label>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-150 focus:outline-none"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <p className="text-red-400/80 text-xs mt-1.5 pl-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors duration-150"
                >
                  Forgot password?
                </Link>
              </div>

              {/*
                SUBMIT BUTTON
                No shine sweep, no translate lift — just a clean,
                reliable color transition. Confidence over spectacle.
              */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-[8px] py-3.5 tracking-[0.015em] transition-colors duration-150 mt-1"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="fp-spinner" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>

            </form>

            {/* Divider */}
            <div className="flex items-center gap-2 fp-reveal" data-d="4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-700 text-[0.58rem] tracking-[0.22em] uppercase">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Sign-up link */}
            <p className="text-center text-sm text-zinc-600 fp-reveal" data-d="5">
              New to Opprine?{' '}
              <Link
                href="/signup"
                className="text-zinc-500 hover:text-zinc-400 font-medium transition-colors duration-150 underline-offset-2 hover:underline"
              >
                Create an account
              </Link>
            </p>

          </div>
        </div>

      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGE EXPORT
// Suspense boundary required because SigninForm uses
// useSearchParams(), which needs it in Next.js App Router.
// ─────────────────────────────────────────────────────────────
export default function SigninPage() {
  return (
    <Suspense fallback={
      <div className="fp-sans min-h-screen bg-[#09090b] flex items-center justify-center">
        <p className="text-zinc-700 text-[0.7rem] tracking-[0.25em] uppercase">Loading</p>
      </div>
    }>
      <SigninForm />
    </Suspense>
  )
}