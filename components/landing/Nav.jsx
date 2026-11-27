'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Brand, StartLink } from './ui'
import styles from './landing.module.css'

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

function SectionLinks({ active, onActivate }) {
  return NAV_LINKS.map(({ href, label }) => (
    <a key={href} href={href} aria-current={active === href ? 'location' : undefined} onClick={onActivate}>{label}</a>
  ))
}

export default function Nav() {
  const [active, setActive] = useState('#product')
  const [open, setOpen] = useState(false)
  const toggle = useRef(null)

  useEffect(() => {
    const sync = () => setActive(window.location.hash || '#product')
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 800px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  function followSection(event) {
    const section = document.getElementById(event.currentTarget.hash.slice(1))
    setOpen(false)
    requestAnimationFrame(() => {
      section?.setAttribute('tabindex', '-1')
      section?.focus({ preventScroll: true })
    })
  }

  return (
    <header className={styles.header} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        toggle.current?.focus()
      }
    }}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Brand />
        <div className={styles.desktopLinks}><SectionLinks active={active} /></div>
        <div className={styles.desktopLinks}>
          <Link href="/signin">Sign in</Link>
          <StartLink compact>Get started free</StartLink>
        </div>
        <button ref={toggle} type="button" className={styles.menuToggle} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="opprine-menu" onClick={() => setOpen(!open)}>
          <span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        <div className={styles.mobileMenu} id="opprine-menu" hidden={!open}>
          <SectionLinks active={active} onActivate={followSection} />
          <Link href="/signin" onClick={() => setOpen(false)}>Sign in</Link>
          <StartLink>Get started free</StartLink>
        </div>
      </nav>
    </header>
  )
}
