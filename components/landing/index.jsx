import Nav from './Nav'
import Hero from './Hero'
import { Problem, HowItWorks, Features } from './Problem'
import Pricing from './Pricing'
import FAQ from './FAQ'
import { FinalCTA, Footer } from './FinalCTA'
import styles from './landing.module.css'

export default function LandingPage() {
  return (
    <div className={`fp-portal-theme ${styles.landing}`}>
      <a href="#main-content" className={styles.skip}>Skip to content</a>
      <Nav />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
