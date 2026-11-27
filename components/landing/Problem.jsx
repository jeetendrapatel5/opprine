import { PiCheck, PiFileText, PiGitCommit, PiLinkSimple, PiReceipt, PiTimer } from 'react-icons/pi'
import { SectionTitle, Status } from './ui'
import Tagline from './Tagline'
import styles from './landing.module.css'

const steps = [
  ['Set up the project', 'Add milestones to your workspace and share a private project link with your client.'],
  ['Show progress as you work', 'Post project updates, or connect GitHub on Pro or Team to get summaries in plain language.'],
  ['Review, deliver and invoice', 'Share the files, request approval and give your client a place to find the invoice.'],
]

const capabilities = [
  { icon: PiLinkSimple, title: 'One link for every project', body: 'Give clients a private view of milestones, updates, files and invoices. They can open it without an account.' },
  { icon: PiTimer, title: 'A record of what’s waiting', body: 'See when feedback, assets or approval are holding up a project. Opprine records when the wait began.' },
  { icon: PiFileText, title: 'Files with context', body: 'Keep deliverables alongside the work they belong to, so clients can find the right files when it’s time to review.' },
  { icon: PiCheck, title: 'Approvals you can find later', body: 'Record when a client approves a milestone or asks for changes, right in the project history.' },
  { icon: PiReceipt, title: 'A clear path to payment', body: 'Put invoices in the same portal as the work so clients know what they’re paying for and where to find it.' },
]

export function Problem() {
  return (
    <section className={styles.problem} aria-labelledby="problem-title">
      <div className={`${styles.wrap} ${styles.problemGrid}`}>
        <SectionTitle id="problem-title" label="The delivery gap" title="The work is moving. Can your client see it?" />
        <p className={styles.sectionIntro}>When updates live in email, files live in Drive and approvals happen in chat, the client has to piece together the project. Opprine gives them one place to understand what shipped, what needs their input and what happens next.</p>
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section id="workflow" className={`${styles.wrap} ${styles.section}`} aria-labelledby="workflow-title">
      <SectionTitle id="workflow-title" label="Workflow" title="From kickoff to handoff">
        Keep the studio’s work and the client’s next decision connected at every stage.
      </SectionTitle>
      <ol className={styles.steps}>
        {steps.map(([title, description], index) => (
          <li key={title}>
            <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
            <h3 className={styles.heading6}>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Features() {
  return (
    <section id="features" className={styles.featureSection} aria-labelledby="features-title">
      <div className={`${styles.wrap} ${styles.section}`}>
        <SectionTitle id="features-title" label="Platform" title="A shared record of delivery" />
        <div className={styles.featureLead}>
          <div>
            <PiGitCommit aria-hidden="true" />
            <h3 className={styles.heading4}>Turn commits into client updates</h3>
            <p>Connect a GitHub repository and Opprine summarizes development activity in language your client can follow.</p>
          </div>
          <figure className={styles.translation}>
            <figcaption className={styles.previewLabel}><PiGitCommit aria-hidden="true" /> GitHub activity</figcaption>
            <code>fix: validate contact form fields</code>
            <div className={styles.translationResult}>
              <Status tone="done">Client update</Status>
              <p>The contact form now flags missing details before a visitor sends it.</p>
            </div>
          </figure>
        </div>
        <ul className={styles.capabilities}>
          {capabilities.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon aria-hidden="true" />
              <h3 className={styles.heading6}>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>
      </div>
      <Tagline />
    </section>
  )
}
