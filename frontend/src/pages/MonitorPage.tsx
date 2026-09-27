import { useCallback, useEffect, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { MonitorFeed } from '../monitor/MonitorFeed'
import './MonitorPage.css'

type MonitorStatus = {
  running: boolean
  ready: boolean
  people: number
  highest_risk: number
  error: string | null
}
type MonitorState = 'monitoring' | 'elevated' | 'critical'

const emptyStatus: MonitorStatus = {
  running: false,
  ready: false,
  people: 0,
  highest_risk: 0,
  error: null,
}

export default function MonitorPage() {
  const [status, setStatus] = useState<MonitorStatus>(emptyStatus)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [stopped, setStopped] = useState(false)
  const [message, setMessage] = useState('')
  const state: MonitorState = status.highest_risk >= .8
    ? 'critical'
    : status.highest_risk >= .4
      ? 'elevated'
      : 'monitoring'

  const readStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/monitor/status')
      if (!response.ok) throw new Error(`Status request failed (${response.status})`)
      setStatus(await response.json() as MonitorStatus)
    } catch (error) {
      setStatus(previous => ({
        ...previous,
        running: false,
        ready: false,
        error: error instanceof Error ? error.message : 'Backend unavailable',
      }))
    }
  }, [])

  useEffect(() => {
    document.title = 'Monitoring Station — Lifeguard AI'
    void fetch('/api/monitor/start', { method: 'POST' })
      .then(() => readStatus())
      .catch(() => readStatus())
    const timer = window.setInterval(() => void readStatus(), 700)
    const stopOnClose = () => {
      void fetch('/api/monitor/stop', { method: 'POST', keepalive: true })
    }
    window.addEventListener('pagehide', stopOnClose)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pagehide', stopOnClose)
    }
  }, [readStatus])

  async function startCamera() {
    setMessage('Starting the camera and person detector…')
    setStopped(false)
    await fetch('/api/monitor/start', { method: 'POST' })
    setStreamKey(Date.now())
    await readStatus()
    setMessage('')
  }

  async function stopCamera() {
    await fetch('/api/monitor/stop', { method: 'POST' })
    setStopped(true)
    setStatus(emptyStatus)
    setMessage('Camera stopped and released.')
  }

  const percent = Math.round(status.highest_risk * 100)
  return (
    <div className="monitor-page" data-state={state}>
      <a className="skip-link" href="#monitor-main">Skip to monitoring station</a>
      <SiteHeader currentPage="monitor" />
      <main id="monitor-main" className="monitor-main" tabIndex={-1}>
        <div className="monitor-page-heading">
          <div><p className="monitor-overline">Human + AI · Live movement awareness</p><h1>Monitoring Station</h1></div>
          <div className="monitor-camera-label"><span>Camera 0</span><strong>{status.ready ? 'Connected' : stopped ? 'Stopped' : 'Starting'}</strong></div>
        </div>
        <div className="monitor-workspace">
          <MonitorFeed streamKey={streamKey} stopped={stopped} ready={status.ready} />
          <aside className="monitor-attention" aria-labelledby="monitor-status-title">
            <div className="monitor-status-header" role={state === 'critical' ? 'alert' : 'status'}>
              <p className="monitor-overline">Highest movement level</p>
              <h2 id="monitor-status-title"><i aria-hidden="true" />{state === 'critical' ? 'High movement' : state === 'elevated' ? 'Elevated movement' : 'Quiet monitoring'}</h2>
              <p>{state === 'critical' ? 'Sustained erratic movement has reached the red range.' : state === 'elevated' ? 'Movement is building toward the attention range.' : 'Movement levels are currently low.'}</p>
            </div>
            <div className="monitor-risk-summary">
              <div><span>Overall risk</span><strong>{percent}%</strong></div>
              <div className="monitor-risk-track" aria-label={`Highest movement risk ${percent}%`}><i style={{ width: `${percent}%` }} /></div>
              <div className="monitor-risk-scale"><span>Low</span><span>Elevated</span><span>High</span></div>
            </div>
            <dl className="monitor-live-details">
              <div><dt>People visible</dt><dd>{status.people}</dd></div>
              <div><dt>Processing</dt><dd>{status.ready ? 'Live' : status.running ? 'Loading model' : 'Stopped'}</dd></div>
            </dl>
            {status.error && <p className="monitor-error" role="alert">{status.error}</p>}
            <div className="monitor-actions"><button className="monitor-button" onClick={() => void (stopped || !status.running ? startCamera() : stopCamera())}>{stopped || !status.running ? 'Start Camera' : 'Stop Camera'}</button></div>
            <div className="monitor-explanation"><p className="monitor-overline">How the bars move</p><p>Each person’s bar rises while their tracked movement remains strong or changes direction repeatedly. It falls gradually when movement settles.</p></div>
            <p className="monitor-action-feedback" role="status">{message}</p>
          </aside>
        </div>
      </main>
      <footer className="monitor-footer"><p>Human judgment, always.</p><span>Camera 0 · Movement-based risk</span></footer>
    </div>
  )
}
