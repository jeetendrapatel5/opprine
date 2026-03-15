// app/(auth)/signin/page.tsx
'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSession }                             from 'next-auth/react'
import { useForm }                                from 'react-hook-form'
import { zodResolver }                            from '@hookform/resolvers/zod'
import { z }                                      from 'zod'
import { signIn }                                 from 'next-auth/react'
import { useRouter, useSearchParams }             from 'next/navigation'
import Link                                       from 'next/link'

// ─────────────────────────────────────────────────────────────
// VALIDATION — unchanged from original
// ─────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type LoginFormData = z.infer<typeof loginSchema>

// ─────────────────────────────────────────────────────────────
// DESIGN CONSTANTS
//
// INPUT_CLS: the inner <input> element. It is transparent because
// the styled border/background lives on the wrapper div. This lets
// us control focus styles dynamically with React state.
//
// STATS: used to render the three proof numbers on the left panel.
// Change values here — they automatically render in the UI.
// ─────────────────────────────────────────────────────────────
const INPUT_CLS =
  'w-full bg-transparent pt-6 pb-2.5 px-4 text-[0.875rem] text-slate-100 outline-none placeholder:opacity-0'

const STATS = [
  { value: '2,400+', label: 'Freelancers' },
  { value: '₹48Cr+', label: 'Invoiced'    },
  { value: '4.9 ★',  label: 'Rating'      },
]

// ─────────────────────────────────────────────────────────────
// KEYFRAMES & GLOBAL STYLES
//
// This block exists ONLY for things Tailwind cannot do:
//   1. @keyframes definitions
//   2. .font-display / .font-ui utility classes (CSS variables
//      approach for fonts avoids adding to tailwind.config.js)
//   3. background-clip: text (text-shimmer)
//   4. ::before pseudo-element for grain texture
//   5. :focus-within on a parent (input-wrapper glow line)
//   6. button ::after shine sweep (pseudo on hover state)
//
// Everything structural — spacing, flex, colors, responsive —
// is handled by Tailwind in the JSX below.
// ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  /* Font utility classes — applied via className="font-display" or "font-ui" */
  .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
  .font-ui      { font-family: 'DM Sans', system-ui, sans-serif; }

  /* ── Aurora blobs drift slowly around the left panel ── */
  @keyframes auroraA {
    0%, 100% { transform: translate(0, 0)    scale(1);    }
    33%       { transform: translate(6%, 8%)  scale(1.1);  }
    66%       { transform: translate(-4%, 5%) scale(0.95); }
  }
  @keyframes auroraB {
    0%, 100% { transform: translate(0, 0)     scale(1);    }
    40%       { transform: translate(-7%, -6%) scale(1.12); }
    70%       { transform: translate(5%, 4%)   scale(0.9);  }
  }
  @keyframes auroraC {
    0%, 100% { transform: translate(0, 0)    scale(1);    }
    50%       { transform: translate(5%, -8%) scale(1.06); }
  }

  /* ── Form card elements fade up on page load ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  /* ── Headline shimmer sweep ── */
  @keyframes shimmerText {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  /* ── Button: light sweeps across on hover ── */
  @keyframes shineSweep {
    from { transform: translateX(-150%) skewX(-15deg); }
    to   { transform: translateX(280%)  skewX(-15deg); }
  }

  /* ── Loading spinner ring ── */
  @keyframes spinRing {
    to { transform: rotate(360deg); }
  }

  /* ── Apply aurora animations ── */
  .aurora-a { animation: auroraA 20s ease-in-out infinite;     }
  .aurora-b { animation: auroraB 26s ease-in-out infinite 4s;  }
  .aurora-c { animation: auroraC 16s ease-in-out infinite 8s;  }

  /* ── Shimmer gradient text ── */
  .text-shimmer {
    background: linear-gradient(90deg, #93c5fd, #dbeafe, #60a5fa, #dbeafe);
    background-size: 250% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmerText 4s linear infinite;
  }

  /* ── Grain texture overlaid on the entire page ──
     Creates an expensive printed/film quality.
     opacity: 0.03 is intentionally subtle — barely visible
     but felt subconsciously as depth/texture.               */
  .fp-grain::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.03;
    pointer-events: none;
    z-index: 999;
    mix-blend-mode: overlay;
  }

  /* ── Input wrapper: thin blue glow line appears at the bottom
     of the field container when ANY child is focused.
     :focus-within matches the wrapper when its child input is focused. ── */
  .input-wrap {
    position: relative;
    border-radius: 16px;
  }
  .input-wrap::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 12%; right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent);
    opacity: 0;
    border-radius: 0 0 16px 16px;
    transition: opacity 0.3s ease;
  }
  .input-wrap:focus-within::after { opacity: 1; }

  /* ── Submit button: shine sweeps across on hover ──
     The ::after pseudo is a skewed white gradient strip.
     On hover it animates from left edge to right edge.  ── */
  .shine-btn { position: relative; overflow: hidden; }
  .shine-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 50%, transparent 65%);
    transform: translateX(-150%) skewX(-15deg);
  }
  .shine-btn:hover:not(:disabled)::after {
    animation: shineSweep 0.6s ease forwards;
  }

  /* ── Loading spinner ── */
  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spinRing 0.65s linear infinite;
    flex-shrink: 0;
  }
`

// ─────────────────────────────────────────────────────────────
// INLINE SVG ICONS (password toggle)
// Using inline SVG so we don't depend on any icon library.
// If your project has lucide-react, replace with:
//   import { Eye, EyeOff } from 'lucide-react'
// ─────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ─────────────────────────────────────────────────────────────
// SIGNINFORM
// ─────────────────────────────────────────────────────────────
function SigninForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // cursorRef: attached to a large radial gradient div that tracks
  // the mouse cursor, creating a soft light-follows-you effect.
  const cursorRef = useRef<HTMLDivElement>(null)

  const [loginError,   setLoginError]   = useState('')
  const [isLoading,    setIsLoading]    = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // focusedField: tells the floating label which field is active,
  // so we can change label position + color with React state.
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const { status } = useSession()
  const successMessage = searchParams.get('message')

  // watch(): reads live values of fields. We need this to know
  // whether a field has a value (so the label stays floated
  // even after the user tabs away).
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const emailValue    = watch('email',    '')
  const passwordValue = watch('password', '')

  // ── Cursor glow: listens for mousemove and repositions a
  //    large radial gradient div to follow the cursor.
  //    The div itself is `pointer-events-none` so it never
  //    blocks clicks. Left/top transition gives a soft lag. ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!cursorRef.current) return
      cursorRef.current.style.left = `${e.clientX}px`
      cursorRef.current.style.top  = `${e.clientY}px`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard')
  }, [status, router])

  if (status === 'loading' || status === 'authenticated') return null

  // isFloat: returns true when a field's label should float to the
  // top-small position. True when: the field is focused OR has a value.
  const isFloat = (field: 'email' | 'password') =>
    focusedField === field ||
    (field === 'email' ? !!emailValue : !!passwordValue)

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

  // ── LABEL STYLE HELPER ──
  // Returns dynamic inline style for the floating label.
  // Uses inline style (not Tailwind) because the values are
  // computed from React state at runtime.
  const labelStyle = (field: 'email' | 'password'): React.CSSProperties => ({
    position: 'absolute',
    left: '1rem',
    pointerEvents: 'none',
    transition: 'all 0.2s ease',
    top:           isFloat(field) ? '10px'           : '50%',
    transform:     isFloat(field) ? 'none'           : 'translateY(-50%)',
    fontSize:      isFloat(field) ? '0.575rem'       : '0.875rem',
    letterSpacing: isFloat(field) ? '0.12em'         : '0',
    textTransform: isFloat(field) ? 'uppercase' as const : 'none' as const,
    color: focusedField === field
      ? 'rgba(147,197,253,0.8)'   // blue-300 when focused
      : isFloat(field)
        ? 'rgba(255,255,255,0.35)' // dimmer when has value but not focused
        : 'rgba(255,255,255,0.25)',// placeholder-like when empty and resting
  })

  // ── INPUT WRAPPER STYLE HELPER ──
  // The border and glow ring on the wrapper div change with focus state.
  const wrapStyle = (field: 'email' | 'password'): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${
      focusedField === field
        ? 'rgba(59,130,246,0.45)'
        : 'rgba(255,255,255,0.08)'
    }`,
    boxShadow: focusedField === field
      ? '0 0 0 3px rgba(59,130,246,0.1)'
      : 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/*
        PAGE ROOT
        ─────────
        fp-grain  → activates the CSS ::before grain texture overlay
        font-ui   → sets DM Sans as the base font for the whole page
        bg-[#07070f] → deep indigo-black
      */}
      <div className="fp-grain font-ui min-h-screen bg-[#07070f] flex relative overflow-hidden">

        {/*
          CURSOR GLOW
          ───────────
          A 600×600 radial gradient div that follows the mouse.
          Completely invisible to pointer events.
          The transition on left/top creates a smooth ~120ms lag
          that makes the glow feel weightless, not mechanical.
        */}
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-[1]"
          style={{
            width: 600, height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.12s ease-out, top 0.12s ease-out',
          }}
        />

        {/* ═════════════════════════════════════════════════════
            LEFT PANEL — brand identity
            hidden lg:flex → invisible below 1024px, flex above
        ═════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-14 relative overflow-hidden bg-[#080812] border-r border-white/[0.04]">

          {/* Dot-grid texture — the background you can almost feel */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Aurora blob A — large, blue, slow */}
          <div
            className="aurora-a absolute pointer-events-none"
            style={{
              top: '8%', left: '18%', width: 520, height: 520,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 65%)',
              filter: 'blur(45px)',
            }}
          />
          {/* Aurora blob B — medium, indigo */}
          <div
            className="aurora-b absolute pointer-events-none"
            style={{
              bottom: '12%', right: '4%', width: 420, height: 420,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)',
              filter: 'blur(55px)',
            }}
          />
          {/* Aurora blob C — small, cyan, faster */}
          <div
            className="aurora-c absolute pointer-events-none"
            style={{
              top: '52%', left: '4%', width: 280, height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />

          {/*
            "01" WATERMARK
            ──────────────
            A massive, barely-visible editorial number in the background.
            Uses WebkitTextStroke to be an outline, not a filled shape,
            so it doesn't compete with the text content.
            clamp() makes it fluid — never too big or too small.
          */}
          <div
            className="font-display absolute bottom-0 left-0 select-none pointer-events-none"
            style={{
              fontSize: 'clamp(200px, 26vw, 360px)',
              lineHeight: 0.8,
              color: 'transparent',
              WebkitTextStroke: '1px rgba(255,255,255,0.032)',
              fontWeight: 600,
              letterSpacing: '-0.06em',
            }}
          >
            01
          </div>

          {/* ── LOGO ── */}
          <div className="relative z-10">
            <FreeportLogo />
          </div>

          {/* ── HEADLINE + DESCRIPTION ── */}
          <div className="relative z-10 max-w-[500px]">
            <p className="text-blue-400/60 text-[0.63rem] font-semibold tracking-[0.22em] uppercase mb-6">
              Your freelance command center
            </p>

            {/*
              Cormorant Garamond is used here specifically for
              the italic "a real studio." — italic serif at large
              sizes is one of the hallmarks of luxury brand design.
              The rest of the headline is font-light for restraint.
            */}
            <h2
              className="font-display text-white/90 font-light leading-[1.12] mb-7"
              style={{ fontSize: 'clamp(2.1rem, 3.3vw, 3.1rem)', letterSpacing: '-0.01em' }}
            >
              The client portal<br />
              that makes you<br />
              look like{' '}
              <em className="text-shimmer not-italic font-normal">
                a real studio.
              </em>
            </h2>

            <p className="text-white/30 text-[0.875rem] leading-[1.85] max-w-[370px]">
              Manage projects, share files, send invoices, and track milestones —
              all in one beautifully crafted workspace built for freelancers
              who take their work seriously.
            </p>
          </div>

          {/* ── SOCIAL PROOF ── */}
          <div className="relative z-10">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-6 pt-7 mb-7 border-t border-white/[0.06]">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <div className="font-display text-[1.6rem] text-white/80 font-normal tracking-tight leading-tight mb-0.5">
                    {value}
                  </div>
                  <div className="text-white/30 text-[0.65rem] tracking-[0.14em] uppercase">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial card — sits at the bottom of the left panel */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="font-display italic text-white/55 text-[1.1rem] leading-relaxed mb-4">
                "Freeport made my freelance business feel legitimate from day one."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[0.62rem] font-bold text-white shrink-0">
                  AM
                </div>
                <div>
                  <p className="text-white/65 text-[0.8rem] font-medium">Arjun Mehta</p>
                  <p className="text-white/25 text-[0.7rem] tracking-wide">Product Designer · Mumbai</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════
            RIGHT PANEL — sign-in form
        ═════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">

          {/* Ambient glow behind the glass card */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500, height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)',
              filter: 'blur(35px)',
            }}
          />

          {/*
            GLASS CARD
            ──────────
            backdrop-blur-[24px] → frosted glass effect (content behind blurs).
            WebkitBackdropFilter  → Safari requires the -webkit- prefix; Tailwind
                                    doesn't add it automatically, so inline style needed.
            box-shadow layers:
              [1] 0 0 0 1px rgba(white,0.03)  → thin outer ring, depth
              [2] 0 40px 80px rgba(black,0.55) → large soft shadow, lifts card
              [3] inset 0 1px 0 rgba(white,0.06) → top edge highlight, luxury feel
          */}
          <div
            className="relative z-10 w-full max-w-[420px] rounded-3xl p-8 lg:p-10 backdrop-blur-[24px] bg-white/[0.025]"
            style={{
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div className="space-y-7">

              {/* Mobile-only logo */}
              <div
                className="flex lg:hidden justify-center"
                style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.05s forwards' }}
              >
                <FreeportLogo />
              </div>

              {/* ── HEADING ── */}
              <div style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.08s forwards' }}>
                <h1
                  className="font-display text-white/90 font-light leading-tight mb-2"
                  style={{ fontSize: '2.15rem', letterSpacing: '-0.01em' }}
                >
                  Welcome back
                </h1>
                <p className="text-white/30 text-sm tracking-wide">
                  Sign in to continue to your workspace
                </p>
              </div>

              {/* ── SUCCESS BANNER ── */}
              {successMessage && (
                <div
                  className="bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400/90 rounded-2xl px-4 py-3 text-sm"
                  style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.12s forwards' }}
                >
                  {successMessage}
                </div>
              )}

              {/* ── ERROR BANNER ── */}
              {loginError && (
                <div
                  className="bg-red-500/[0.08] border border-red-500/20 text-red-400/90 rounded-2xl px-4 py-3 text-sm"
                  style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.12s forwards' }}
                >
                  {loginError}
                </div>
              )}

              {/* ── FORM ── */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.18s forwards' }}
              >

                {/* ─── Email field ─── */}
                <div>
                  {/*
                    The wrapper div has class "input-wrap" which:
                      - Holds the border and background styling
                      - Activates the CSS ::after bottom-glow-line via :focus-within
                    The border color and box-shadow change via inline wrapStyle()
                    because they depend on React state (focusedField).
                  */}
                  <div className="input-wrap" style={wrapStyle('email')}>
                    <div className="relative">
                      <input
                        {...register('email')}
                        type="email"
                        className={INPUT_CLS}
                        style={{ borderRadius: 16 }}
                        onFocus={() => setFocusedField('email')}
                        onBlur={()  => setFocusedField(null)}
                      />
                      {/*
                        Floating label — transitions between two states:
                        RESTING:  centered vertically, normal size, dim
                        FLOATING: small + uppercase at the top, blue when focused
                        labelStyle() returns the correct inline styles.
                      */}
                      <label style={labelStyle('email')}>
                        Email Address
                      </label>
                    </div>
                  </div>
                  {errors.email && (
                    <p className="text-red-400/80 text-xs mt-1.5 pl-1 flex items-center gap-1.5">
                      <span>⚠</span> {errors.email.message}
                    </p>
                  )}
                </div>

                {/* ─── Password field ─── */}
                <div>
                  <div className="input-wrap" style={wrapStyle('password')}>
                    {/*
                      Password input has pr-10 to make room for the
                      eye icon toggle button on the right.
                    */}
                    <div className="relative flex items-center">
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        className={`${INPUT_CLS} pr-12`}
                        style={{ borderRadius: 16 }}
                        onFocus={() => setFocusedField('password')}
                        onBlur={()  => setFocusedField(null)}
                      />
                      <label style={labelStyle('password')}>
                        Password
                      </label>

                      {/* Password visibility toggle button */}
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-4 text-white/25 hover:text-white/60 transition-colors duration-200 focus:outline-none"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  {errors.password && (
                    <p className="text-red-400/80 text-xs mt-1.5 pl-1 flex items-center gap-1.5">
                      <span>⚠</span> {errors.password.message}
                    </p>
                  )}
                </div>

                {/*
                  SUBMIT BUTTON
                  ─────────────
                  shine-btn class activates the CSS ::after shine sweep on hover.
                  hover:-translate-y-0.5 → subtle lift.
                  hover:shadow-[...] → blue glow appears on hover, matches brand.
                  disabled: states make it clear the form is processing.
                  The loading state shows a spinning SVG ring, not just text.
                */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="shine-btn w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl py-3.5 text-[0.875rem] tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(59,130,246,0.38)] active:translate-y-0 mt-1"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <span className="spinner" />
                      Signing in...
                    </span>
                  ) : (
                    'Continue to workspace →'
                  )}
                </button>

              </form>

              {/* ── DIVIDER ── */}
              <div
                className="flex items-center gap-4"
                style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.28s forwards' }}
              >
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-white/20 text-[0.6rem] tracking-[0.2em] uppercase">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* ── SIGN UP LINK ── */}
              <p
                className="text-center text-sm text-white/30"
                style={{ opacity: 0, animation: 'fadeUp 0.5s ease 0.34s forwards' }}
              >
                New to Freeport?{' '}
                <Link
                  href="/signup"
                  className="text-blue-400/90 font-medium hover:text-blue-300 underline-offset-2 hover:underline transition-colors"
                >
                  Create a free account
                </Link>
              </p>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// FREEPORTLOGO
// Reusable component — appears in two places:
//   1. Top of left panel on desktop
//   2. Above form on mobile (left panel hidden there)
// The box-shadow on the icon square mimics a glow, matching
// the blue brand color.
// ─────────────────────────────────────────────────────────────
function FreeportLogo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0"
        style={{ boxShadow: '0 4px 18px rgba(59,130,246,0.38)' }}
      >
        <span className="font-display text-white font-semibold text-xl leading-none">
          F
        </span>
      </div>
      <span className="text-slate-100 font-semibold text-[1.05rem] tracking-tight">
        Freeport
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIGNINPAGE — exported Next.js page
// Suspense is required because SigninForm uses useSearchParams()
// which needs Suspense boundary in Next.js 13+.
// ─────────────────────────────────────────────────────────────
export default function SigninPage() {
  return (
    <Suspense fallback={
      <div className="fp-grain font-ui min-h-screen bg-[#07070f] flex items-center justify-center">
        <p className="text-white/15 text-xs tracking-[0.25em] uppercase">Loading</p>
      </div>
    }>
      <SigninForm />
    </Suspense>
  )
}