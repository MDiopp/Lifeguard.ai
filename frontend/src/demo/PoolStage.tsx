import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Props = { src?: string; playing: boolean; children?: ReactNode; onTime: (time: number) => void; onEnded: () => void; onMediaError: () => void }

export function PoolStage({ src, playing, children, onTime, onEnded, onMediaError }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [aspect, setAspect] = useState(16 / 9)
  useEffect(() => {
    if (!video.current) return
    if (playing) void video.current.play().catch(onMediaError)
    else video.current.pause()
  }, [onMediaError, playing])
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (video.current) onTime(video.current.currentTime)
    }, 50)
    return () => window.clearInterval(timer)
  }, [onTime, playing])
  return <div className="demo-stage-shell"><div className="demo-stage" style={{ aspectRatio: aspect }} aria-label="Pool footage">{src ? <video ref={video} src={src} playsInline muted preload="auto" onLoadedMetadata={event => setAspect(event.currentTarget.videoWidth / event.currentTarget.videoHeight)} onTimeUpdate={event => onTime(event.currentTarget.currentTime)} onEnded={onEnded} onError={onMediaError} /> : <div className="demo-video-ready"><span>Round ready</span></div>}{children}</div></div>
}
