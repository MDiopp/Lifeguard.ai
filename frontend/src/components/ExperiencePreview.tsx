import { useId } from 'react'

type ExperiencePreviewProps = {
  title: string
  description: string
  availableNote: string
  primary?: boolean
  expanded: boolean
  onToggle: () => void
}

export function ExperiencePreview({
  title, description, availableNote, primary = false, expanded, onToggle,
}: ExperiencePreviewProps) {
  const id = useId()
  return (
    <div className="experience" data-expanded={expanded}>
      <h2 className="experience-heading">
        <button
          type="button"
          className={'experience-button' + (primary ? ' experience-button-primary' : '')}
          id={id + '-button'}
          aria-expanded={expanded}
          aria-controls={id + '-preview'}
          onClick={onToggle}
        >
          <span>{title}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </button>
      </h2>
      <div
        id={id + '-preview'}
        role="region"
        aria-labelledby={id + '-button'}
        className="experience-preview"
        hidden={!expanded}
      >
        <p className="preview-label">Experience preview</p>
        <p>{description}</p>
        <p className="availability">{availableNote}</p>
      </div>
    </div>
  )
}
