import { PiCheck } from 'react-icons/pi'
import { PRICING_TIERS } from './data'
import { SectionTitle, StartLink } from './ui'
import styles from './landing.module.css'

export default function Pricing() {
  return (
    <section id="pricing" className={`${styles.wrap} ${styles.section}`} aria-labelledby="pricing-title">
      <SectionTitle id="pricing-title" label="Pricing" title="Start with your next project">
        Every plan includes a private client portal, milestones, file delivery and approvals.
      </SectionTitle>
      <div className={styles.plans}>
        {PRICING_TIERS.map(({ name, description, price, period, cta, note, features }) => (
          <article key={name} className={styles.plan}>
            <h3 className={styles.heading5}>{name}</h3>
            <p>{description}</p>
            <div className={styles.price}><strong>{price}</strong> <span>{period}</span></div>
            <ul>
              {features.map((feature) => <li key={feature}><PiCheck aria-hidden="true" />{feature}</li>)}
            </ul>
            <div className={styles.planAction}>
              <StartLink>{cta}</StartLink>
              <p>{note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
