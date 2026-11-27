import { PiPlus } from 'react-icons/pi'
import { FAQS } from './data'
import { SectionTitle } from './ui'
import styles from './landing.module.css'

export default function FAQ() {
  return (
    <section id="faq" className={styles.faqSection} aria-labelledby="faq-title">
      <div className={`${styles.wrap} ${styles.section} ${styles.faqGrid}`}>
        <SectionTitle id="faq-title" label="FAQ" title="Before you get started" />
        <div className={styles.questions}>
          {FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<PiPlus aria-hidden="true" /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
