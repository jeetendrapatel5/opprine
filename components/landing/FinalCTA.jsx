import Link from 'next/link'
import { FINAL_CTA, FINAL_NOTE } from './data'
import { Brand, StartLink } from './ui'
import styles from './landing.module.css'

export function FinalCTA() {
  return (
    <section className={`${styles.wrap} ${styles.closeSection}`} aria-labelledby="start-title">
      <div className={styles.closePanel}>
        <div>
          <h2 id="start-title" className={styles.heading2}>Give your next project a home</h2>
          <p>Set up the milestones, share the portal and give your client one place to follow the work.</p>
        </div>
        <div>
          <StartLink>{FINAL_CTA}</StartLink>
          <p className={styles.closeNote}>{FINAL_NOTE}</p>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const supportEmail = process.env.LEGAL_SUPPORT_EMAIL?.trim()

  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footerGrid}`}>
        <div>
          <Brand />
          <p>Client project delivery for web studios and freelancers.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#pricing">Pricing</a>
          {supportEmail && <a href={`mailto:${supportEmail}`}>Contact</a>}
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
        </nav>
      </div>
    </footer>
  )
}
