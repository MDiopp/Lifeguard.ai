import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { frameAt } from './preview'
import { PoolIllustration } from '../components/PoolIllustration'
import type { Point, Round } from './preview'

type Props = {
  round: Round; time: number; active: boolean; playing: boolean
  feedback: Point | null; reveal?: string; children?: ReactNode
  onTap: (point: Point, timestamp: number) => void
  onTime: (time: number) => void
  onEnded: () => void
  onMediaError: () => void
}

export function PoolStage({ round, time, active, playing, feedback, reveal, onTap, onTime, onEnded, onMediaError, children }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [aspect, setAspect] = useState(16 / 9)
  useEffect(() => { if (!active) setCursor(null) }, [active])
  useEffect(() => {
    if (!video.current) return
    if (playing) void video.current.play().catch(onMediaError)
    else video.current.pause()
  }, [playing, onMediaError])
  return (
    <div className="demo-stage-shell">
      <div className="demo-stage" style={{ aspectRatio: aspect }} role={active ? 'button' : 'group'} tabIndex={active ? 0 : undefined}
        aria-label={active ? 'Pool footage. Tap a swimmer. Keyboard: use arrow keys to move your cursor and Enter to select.' : 'Pool preview'}
        onClick={event => {
          if (!active) return
          const rect = event.currentTarget.getBoundingClientRect()
          onTap({ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }, video.current?.currentTime ?? time)
        }}
        onKeyDown={event => {
          if (!active) return
          const position = cursor ?? { x: .5, y: .5 }
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault()
            setCursor({ x: Math.min(.97, Math.max(.03, position.x + (event.key === 'ArrowRight' ? .02 : event.key === 'ArrowLeft' ? -.02 : 0))), y: Math.min(.95, Math.max(.05, position.y + (event.key === 'ArrowDown' ? .02 : event.key === 'ArrowUp' ? -.02 : 0))) })
          } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTap(position, video.current?.currentTime ?? time) }
        }}>
        {round.videoSrc ? <video ref={video} src={round.videoSrc} playsInline muted preload="auto"
          onLoadedMetadata={e => setAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
          onTimeUpdate={e => onTime(e.currentTarget.currentTime)} onEnded={onEnded} onError={onMediaError} /> : (
          <PoolIllustration swimmers={frameAt(round, time)} time={time} reveal={reveal} />
        )}
        {cursor && active && <span className="demo-cursor" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} />}
        {feedback && <span className="demo-tap-ring" style={{ left: `${feedback.x * 100}%`, top: `${feedback.y * 100}%` }} />}
      </div>
      {children}
    </div>
  )
}
