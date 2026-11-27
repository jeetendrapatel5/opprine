import { PiArrowDown, PiCheck, PiClock, PiFileText, PiFolderSimple, PiLockSimple, PiSquaresFour } from 'react-icons/pi'
import { FINAL_CTA, FINAL_NOTE } from './data'
import { StartLink, Status } from './ui'
import styles from './landing.module.css'

const milestones = [
  { title: 'Discovery and scope', status: 'Approved', tone: 'done' },
  { title: 'Homepage build', status: 'In review', tone: 'review' },
  { title: 'Site launch', status: 'Upcoming', tone: 'pending' },
]

function PortalPreview() {
  return (
    <figure className={styles.stage} aria-labelledby="portal-caption">
      <div className={styles.stageHeader}>
        <span><PiLockSimple aria-hidden="true" /> Private client portal</span>
        <span id="portal-caption">Example project</span>
      </div>
      <div className={styles.portal}>
        <div className={styles.portalTop}>
          <span className={styles.projectMark} aria-hidden="true">N</span>
          <div><strong>Northline Studio</strong><span>Client workspace</span></div>
        </div>
        <div className={styles.portalTabs} aria-hidden="true">
          <span><PiSquaresFour /> Overview</span><span><PiFolderSimple /> Files</span><span><PiFileText /> Invoices</span>
        </div>
        <div className={styles.portalBody}>
          <p className={styles.kicker}>Website project</p>
          <h2 className={styles.heading5}>Northline website</h2>
          <div className={styles.portalGrid}>
            <div className={styles.milestones}>
              <p className={styles.previewLabel}>Milestones</p>
              <ul>
                {milestones.map(({ title, status, tone }) => (
                  <li key={title}>
                    <span>{title}</span><Status tone={tone}>{status}</Status>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.nextAction}>
              <p className={styles.previewLabel}><PiClock aria-hidden="true" /> Next up</p>
              <strong>Review the homepage</strong>
              <p>The responsive build is ready for your feedback.</p>
              <span className={styles.reviewNote}><span aria-hidden="true" /> Waiting for client</span>
            </div>
          </div>
          <div className={styles.portalUpdate}>
            <PiCheck aria-hidden="true" /><span><strong>Latest update</strong> · Mobile layout and contact form are ready for review</span>
          </div>
        </div>
      </div>
    </figure>
  )
}

export default function Hero() {
  return (
    <section id="product" className={`${styles.wrap} ${styles.hero}`}>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}><span className={styles.signal} aria-hidden="true" /> Client delivery for web studios</p>
        <h1 className={styles.heading1}>Give every client project a clear next step</h1>
        <p className={styles.heroIntro}>Opprine gives web agencies and freelancers one private portal for project progress, files, approvals and invoices.</p>
        <div className={styles.actions}>
          <StartLink>{FINAL_CTA}</StartLink>
          <a className={styles.textAction} href="#workflow">See how it works <PiArrowDown aria-hidden="true" /></a>
        </div>
        <p className={styles.heroNote}>Free plan available. {FINAL_NOTE}</p>
      </div>
      <PortalPreview />
    </section>
  )
}
