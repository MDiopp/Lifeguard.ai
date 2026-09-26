import { MotionToggle } from './MotionToggle'

type SiteHeaderProps = {
  paused: boolean
  reduced: boolean
  onToggleMotion: () => void
}

export function SiteHeader({ paused, reduced, onToggleMotion }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Lifeguard AI home">
        <svg className="brand-mark" viewBox="0 0 48 40" aria-hidden="true">
          <path d="M3 13C10 3 17 3 24 13S38 23 45 13M3 26C10 16 17 16 24 26S38 36 45 26" />
        </svg>
        <span>lifeguard<span className="brand-ai">AI</span></span>
      </a>
      <MotionToggle paused={paused} reduced={reduced} onToggle={onToggleMotion} />
    </header>
  )
}
