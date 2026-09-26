type MotionToggleProps = {
  paused: boolean
  reduced: boolean
  onToggle: () => void
}

export function MotionToggle({ paused, reduced, onToggle }: MotionToggleProps) {
  return (
    <button
      className="motion-toggle"
      type="button"
      aria-label={reduced ? 'Motion off: following your reduced-motion preference' : 'Pause background motion'}
      aria-pressed={paused || reduced}
      aria-disabled={reduced}
      onClick={reduced ? undefined : onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {paused || reduced
          ? <path d="m9 6 9 6-9 6Z" />
          : <path d="M9 6v12M15 6v12" />}
      </svg>
      <span>{reduced ? 'Motion off' : paused ? 'Resume motion' : 'Pause motion'}</span>
    </button>
  )
}
