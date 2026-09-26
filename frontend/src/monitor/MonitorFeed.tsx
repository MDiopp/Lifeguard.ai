import { useState } from 'react'
import { PoolIllustration } from '../components/PoolIllustration'
import { mediaTimestamp, monitoringLabels, previewSwimmers } from './preview'
import type { Camera, MonitoringSnapshot } from './preview'

export function MonitorFeed({ camera, snapshot }: { camera: Camera; snapshot: MonitoringSnapshot }) {
  const [unavailable, setUnavailable] = useState(false)
  const [aspect, setAspect] = useState(16 / 9)
  const event = snapshot.event
  return (
    <section className="monitor-feed-section" aria-labelledby="camera-title">
      <div className="monitor-feed-heading"><div><p className="monitor-overline">Active zone</p><h2 id="camera-title">{camera.name} <span>/ {camera.zone}</span></h2></div><span className="monitor-source-tag">{camera.source.kind === 'illustration' ? 'Illustrated feed' : 'Video source'}</span></div>
      <div className="monitor-feed-frame" role={camera.source.kind === 'illustration' ? 'img' : undefined} style={{ aspectRatio: aspect }} aria-label={`${camera.name}, ${camera.zone}. ${camera.source.kind === 'illustration' ? 'Static illustrated preview.' : 'Camera video.'}`}>
        {camera.source.kind === 'illustration' ? <PoolIllustration swimmers={previewSwimmers} /> : <video key={camera.source.src} src={camera.source.src} controls playsInline muted preload="metadata" onLoadedMetadata={e => { setAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight); setUnavailable(false) }} onError={() => setUnavailable(true)} />}
        {unavailable && <div className="monitor-feed-unavailable" role="alert"><h3>Feed unavailable</h3><p>The video source could not be loaded. Monitoring cannot be verified.</p></div>}
        {event && !unavailable && <div className="monitor-tracking" aria-label={`Highlighted swimmer ${event.trackId}`} style={{ left: `${event.bounds.x * 100}%`, top: `${event.bounds.y * 100}%`, width: `${event.bounds.width * 100}%`, height: `${event.bounds.height * 100}%` }}><span>{event.trackId} · Attention</span></div>}
      </div>
      <div className="monitor-feed-caption"><span className="monitor-state-caption"><i aria-hidden="true" />{unavailable ? 'Feed unavailable' : monitoringLabels[snapshot.state]}</span><span>Sample frame <time>{mediaTimestamp(snapshot.frameSeconds)}</time></span></div>
      <p className="monitor-feed-note">Illustration and sample observations only. No live camera or detection service is connected.</p>
    </section>
  )
}
