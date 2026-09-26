import { useEffect, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { MonitorFeed } from '../monitor/MonitorFeed'
import { mediaTimestamp, monitoringLabels, previewCamera, previewSnapshots } from '../monitor/preview'
import type { MonitoringState } from '../monitor/preview'
import './MonitorPage.css'

export default function MonitorPage() {
  const [state, setState] = useState<MonitoringState>('monitoring')
  const [acknowledged, setAcknowledged] = useState(false)
  const [notificationPreviewed, setNotificationPreviewed] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [message, setMessage] = useState('')
  const snapshot = previewSnapshots[state]
  const event = snapshot.event
  useEffect(() => { document.title = 'Monitoring Station — Lifeguard AI' }, [])
  function changeState(next: MonitoringState) {
    setState(next); setAcknowledged(false); setNotificationPreviewed(false); setReviewOpen(false); setMessage('')
  }
  return (
    <div className="monitor-page" data-state={state}>
      <a className="skip-link" href="#monitor-main">Skip to monitoring station</a>
      <SiteHeader currentPage="monitor" />
      <main id="monitor-main" className="monitor-main" tabIndex={-1}>
        <div className="monitor-page-heading"><div><p className="monitor-overline">Human + AI · A second layer of attention</p><h1>Monitoring Station</h1></div><div className="monitor-camera-label"><span>Camera 01</span><strong>{previewCamera.zone}</strong></div></div>
        <div className="monitor-preview-bar"><p><strong>Preview mode</strong><span>One monitored zone. Sample states for review.</span></p><label htmlFor="monitor-preview-state">Preview state<select id="monitor-preview-state" value={state} onChange={e => changeState(e.target.value as MonitoringState)}><option value="monitoring">Normal monitoring</option><option value="possible-distress">Possible distress</option><option value="critical">Critical attention</option></select></label></div>
        <div className="monitor-workspace">
          <MonitorFeed camera={previewCamera} snapshot={snapshot} />
          <section className="monitor-attention" aria-labelledby="monitor-status-title">
            <div className="monitor-status-header" role={state === 'critical' ? 'alert' : 'status'} aria-atomic="true"><p className="monitor-overline">{event ? 'Attention required' : 'Current state'}</p><h2 id="monitor-status-title"><i aria-hidden="true" />{monitoringLabels[state]}</h2><p>{state === 'monitoring' ? 'No signs of distress detected in this sample.' : state === 'critical' ? 'This swimmer requires human attention now.' : 'Concerning behavior observed. Check the highlighted swimmer.'}</p></div>
            {event ? <>
              <div className="monitor-swimmer"><p className="monitor-overline">Swimmer {event.trackId}</p><h3>{event.description}</h3><p>{event.location}</p></div>
              <div className="monitor-actions"><button className="monitor-button" disabled={acknowledged} onClick={() => { setAcknowledged(true); setMessage('Acknowledged in this preview. The attention state remains active.') }}>{acknowledged ? 'Acknowledged' : 'Acknowledge'}</button><button className="monitor-button monitor-button-secondary" disabled={notificationPreviewed} onClick={() => { setNotificationPreviewed(true); setMessage('Notification preview recorded. No message was sent to a lifeguard.') }}>{notificationPreviewed ? 'Notification previewed' : 'Notify Lifeguard'}</button></div>
              <dl className="monitor-event-times"><div><dt>Observed for</dt><dd>{event.observedForSeconds.toFixed(1)} seconds</dd></div><div><dt>First flagged</dt><dd>{mediaTimestamp(event.detectedAtSeconds)} <span>in sample</span></dd></div></dl>
              <div className="monitor-signals"><h3>Observed signals</h3><ul>{event.signals.map(signal => <li key={signal}>{signal}</li>)}</ul></div>
              <button className="monitor-review-button" aria-expanded={reviewOpen} aria-controls="monitor-review-note" onClick={() => setReviewOpen(value => !value)}>Review Analysis <span aria-hidden="true">{reviewOpen ? '−' : '+'}</span></button>
              {reviewOpen && <div id="monitor-review-note" className="monitor-review-note"><h3>Analysis replay is not connected yet.</h3><p>The current observations are listed above. A dedicated replay will be available in a later implementation.</p></div>}
              <p className="monitor-action-note">Actions are local previews. Use your facility’s communication procedure for a real response.</p>
            </> : <div className="monitor-quiet-state"><svg viewBox="0 0 64 40" aria-hidden="true"><path d="M4 12q14-12 28 0t28 0M4 26q14-12 28 0t28 0" /></svg><h3>Attention, when it matters.</h3><p>When a swimmer may need help, their location and observed behavior will appear here.</p><div className="monitor-next-action"><p className="monitor-overline">Operator focus</p><p>Keep watch on the water.<br />Lifeguard AI supports your judgment.</p></div></div>}
            <p className="monitor-action-feedback" role="status">{message}</p>
          </section>
        </div>
      </main>
      <footer className="monitor-footer"><p>Human judgment, always.</p><span>One zone in this preview · {previewCamera.name}</span></footer>
    </div>
  )
}
