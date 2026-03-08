// ─────────────────────────────────────────────────────────────────────────────
// components/landing/hooks.js
//
// All custom hooks used across landing page sections.
// Logic lives here. Components stay clean.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'

// ── useScrollReveal ───────────────────────────────────────────────────────────
// Watches all elements with class "reveal", "reveal-left", "reveal-right",
// or "stagger" and adds "is-visible" when they enter the viewport.
// The CSS in index.jsx defines the transition when is-visible is added.
// Call this once at the root of LandingPage.
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger')
    const io  = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) }
      }),
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ── useScrolled ───────────────────────────────────────────────────────────────
// Returns true once the user scrolls past `threshold` px.
// Used by Nav to switch from transparent to frosted background.
export function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [threshold])
  return scrolled
}

// ── useInView ─────────────────────────────────────────────────────────────────
// Attach the returned ref to any element. inView becomes true once
// that element enters the viewport. Only fires once (then disconnects).
// Used by Stats section to trigger the counter animation at the right time.
export function useInView(threshold = 0.4) {
  const ref    = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); io.disconnect() } },
      { threshold }
    )
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

// ── useCounter ────────────────────────────────────────────────────────────────
// Animates a number from 0 to `target` over `duration` ms using easeOutCubic.
// Only starts when `start` becomes true — lets you trigger on scroll.
export function useCounter(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let t0 = null
    const step = (ts) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target)) // ease out cubic
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return value
}

// ── useTypewriter ─────────────────────────────────────────────────────────────
// Cycles through an array of words, typing and deleting each.
// Returns the current partial string to render.
export function useTypewriter(words, typeSpeed = 80, deleteSpeed = 45, pause = 1600) {
  const [typed,  setTyped]  = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  useEffect(() => {
    let i = 0, deleting = false, timer
    const tick = () => {
      const word = words[wordIdx]
      if (!deleting) {
        setTyped(word.slice(0, i + 1)); i++
        if (i === word.length) { deleting = true; timer = setTimeout(tick, pause); return }
      } else {
        setTyped(word.slice(0, i - 1)); i--
        if (i === 0) { deleting = false; setWordIdx(w => (w + 1) % words.length); timer = setTimeout(tick, 200); return }
      }
      timer = setTimeout(tick, deleting ? deleteSpeed : typeSpeed)
    }
    timer = setTimeout(tick, 300)
    return () => clearTimeout(timer)
  }, [wordIdx]) // eslint-disable-line react-hooks/exhaustive-deps
  return typed
}