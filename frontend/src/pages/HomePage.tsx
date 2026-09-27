import { MotionToggle } from '../components/MotionToggle'
import { SiteHeader } from '../components/SiteHeader'
import { useMotionPreference } from '../hooks/useMotionPreference'
import './HomePage.css'

export function HomePage() {
  const motion = useMotionPreference()

  return (
    <div className="home" data-motion={motion.active ? 'on' : 'off'}>
      <div className="home-sun" aria-hidden="true">
        <div className="home-sun-rays">
          {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
        </div>
        <div className="home-sun-core" />
      </div>
      <div className="home-specks" aria-hidden="true"><i /><i /><i /></div>
      <svg className="home-waves" viewBox="0 0 1440 500" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="home-seafoam" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="var(--seafoam)" />
            <stop offset="1" stopColor="var(--lagoon)" stopOpacity=".48" />
          </linearGradient>
          <linearGradient id="home-lagoon" x1="0" x2="1" y1="0" y2=".4">
            <stop stopColor="var(--seafoam)" />
            <stop offset="1" stopColor="var(--lagoon)" />
          </linearGradient>
          <linearGradient id="home-deep-water" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="var(--lagoon)" />
            <stop offset="1" stopColor="var(--teal)" stopOpacity=".8" />
          </linearGradient>
        </defs>
        <g className="home-wave home-wave-back">
          <path fill="url(#home-seafoam)" d="M-80 246C100 110 236 324 432 238S645 169 810 183 1035 70 1180 38 1390 59 1520 117V560H-80Z" />
        </g>
        <g className="home-wave home-wave-middle">
          <path fill="url(#home-lagoon)" d="M-80 330C81 172 237 413 432 312S628 213 805 237 1070 91 1234 99 1400 184 1520 147V560H-80Z" />
          <path className="home-wave-foam" d="M-80 347C81 189 237 430 432 329S628 230 805 254 1070 108 1234 116 1400 201 1520 164" />
        </g>
        <g className="home-wave home-wave-front">
          <path fill="url(#home-deep-water)" d="M-80 442C111 300 248 485 430 402S661 305 819 325 1064 198 1230 235 1412 315 1520 262V560H-80Z" />
          <path className="home-wave-ripple" d="M-80 376C93 261 258 440 430 366S652 261 805 288 1066 153 1230 190 1412 270 1520 218" />
        </g>
      </svg>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader currentPage="home" />
      <main id="main" className="home-main" tabIndex={-1}>
        <section className="introduction" aria-labelledby="hero-title">
          <p className="eyebrow">Pool safety, reimagined</p>
          <h1 id="hero-title" className="hero-title">
            <span>A Second Layer</span>{' '}<span>of Surveillance</span>
          </h1>
          <p className="hero-description">
            An extra set of eyes on the water. Lifeguard AI helps lifeguards
            notice signs of distress and direct attention where it matters most.
          </p>
          <div className="home-actions">
            <a className="home-cta home-cta-primary" href="/monitor">Start Monitoring</a>
            <a className="home-cta home-cta-secondary" href="/demo">Try Human vs AI</a>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <p>Computer vision for safer water</p>
        <MotionToggle paused={motion.paused} reduced={motion.reduced} onToggle={motion.toggle} />
      </footer>
    </div>
  )
}
