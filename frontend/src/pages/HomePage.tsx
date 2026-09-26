import { useState } from 'react'
import { ExperiencePreview } from '../components/ExperiencePreview'
import { SiteHeader } from '../components/SiteHeader'
import { WaterlineEnvironment } from '../components/waterline/WaterlineEnvironment'
import { useMotionPreference } from '../hooks/useMotionPreference'
import './HomePage.css'

export function HomePage() {
  const motion = useMotionPreference()
  const [preview, setPreview] = useState<'demo' | 'monitor' | null>(null)

  return (
    <div className="home" data-motion={motion.active ? 'on' : 'off'}>
      <WaterlineEnvironment motionActive={motion.active} />
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader paused={motion.paused} reduced={motion.reduced} onToggleMotion={motion.toggle} />
      <main id="main" className="home-main" tabIndex={-1}>
        <section className="introduction" aria-labelledby="hero-title">
          <p className="eyebrow">A fresh perspective on pool safety</p>
          <h1 id="hero-title" className="hero-title">
            <span>An extra set</span>{' '}<span>of eyes.</span>
          </h1>
          <p className="hero-description">AI-assisted awareness. Human judgment, always.</p>
        </section>
        <section className="experience-dock" aria-label="Explore Lifeguard AI" onKeyDown={event => {
          if (event.key === 'Escape') setPreview(null)
        }}>
          <div className="experiences">
            <ExperiencePreview
              title="Human vs AI"
              description="Watch the pool. Spot a swimmer who may need help. The planned challenge will compare your observations with Lifeguard AI, then reveal the analysis."
              availableNote="The challenge is not available yet."
              primary
              expanded={preview === 'demo'}
              onToggle={() => setPreview(preview === 'demo' ? null : 'demo')}
            />
            <ExperiencePreview
              title="Monitoring"
              description="A focused view of the pool, designed to bring possible signs of distress to a lifeguard’s attention through clear, explainable observations."
              availableNote="Monitoring is not available yet. No live feed is connected."
              expanded={preview === 'monitor'}
              onToggle={() => setPreview(preview === 'monitor' ? null : 'monitor')}
            />
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <p>Designed to support lifeguards.</p>
        <span className="water-hint" aria-hidden="true">
          <svg viewBox="0 0 32 20"><path d="M2 7q7-8 14 0t14 0M2 14q7-8 14 0t14 0" /></svg>
          <span className="hint-pointer">Move across the water</span>
          <span className="hint-touch">Touch the water</span>
        </span>
      </footer>
    </div>
  )
}
