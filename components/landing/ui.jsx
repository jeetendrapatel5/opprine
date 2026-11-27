import Image from 'next/image'
import Link from 'next/link'
import { PiArrowRight } from 'react-icons/pi'
import styles from './landing.module.css'

export function Brand() {
  return (
    <Link href="/" aria-label="Opprine home" className={styles.brand}>
      <Image src="/logo/opprine-main-logo.png" alt="" width={112} height={45} className={styles.logo} />
    </Link>
  )
}

export function StartLink({ children, compact = false }) {
  return (
    <Link href="/signup" className={`${styles.button} ${compact ? styles.compact : ''}`}>
      {children}<PiArrowRight aria-hidden="true" />
    </Link>
  )
}

export function SectionTitle({ label, title, children, id }) {
  return (
    <div className={styles.sectionTitle}>
      <p className={styles.kicker}>{label}</p>
      <h2 id={id} className={styles.heading2}>{title}</h2>
      {children && <p className={styles.sectionIntro}>{children}</p>}
    </div>
  )
}

export function Status({ children, tone = 'review' }) {
  return <span className={styles.status} data-tone={tone}><span aria-hidden="true" />{children}</span>
}
