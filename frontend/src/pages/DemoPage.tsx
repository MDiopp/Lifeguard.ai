import { useCallback, useEffect, useRef, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { PoolStage } from '../demo/PoolStage'
import { previewResult, previewRounds, submitPreviewTap, swimmerDescription } from '../demo/preview'
import type { Point, RoundResult, Selection } from '../demo/preview'
import './DemoPage.css'

type Phase = 'intro' | 'countdown' | 'active' | 'submitted' | 'ending' | 'results' | 'complete'
const firstLabels = { human: 'You noticed first.', ai: 'Lifeguard AI noticed first.', tie: 'A shared moment of attention.', neither: 'The swimmer was missed.' }

export default function DemoPage() {
  const [roundIndex, setRoundIndex] = useState<0 | 1>(0)
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [time, setTime] = useState(0)
  const [paused, setPaused] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [feedback, setFeedback] = useState<Point | null>(null)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<RoundResult[]>([])
  const [mediaError, setMediaError] = useState(false)
  const stageArea = useRef<HTMLDivElement>(null)
  const stateHeading = useRef<HTMLHeadingElement>(null)
  const clock = useRef(0)
  const tapLocked = useRef(false)
  const round = previewRounds[roundIndex]
  const result = results.find(r => r.roundId === round.id)
  const playing = phase === 'active' && !paused && !mediaError

  useEffect(() => { document.title = 'Human vs AI — Lifeguard AI' }, [])
  useEffect(() => {
    if (phase === 'intro') window.scrollTo({ top: 0, behavior: 'instant' })
    if (phase === 'results' || phase === 'complete') stateHeading.current?.focus()
    if (phase === 'active') stageArea.current?.querySelector<HTMLElement>('[role="button"]')?.focus({ preventScroll: true })
  }, [phase])
  useEffect(() => {
    const onHidden = () => { if (document.hidden && (phase === 'active' || phase === 'countdown')) setPaused(true) }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [phase])
  useEffect(() => {
    if (phase !== 'countdown' || paused) return
    const timer = window.setTimeout(() => {
      if (countdown === 1) setPhase('active')
      else setCountdown(value => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [phase, countdown, paused])
  useEffect(() => {
    if (!playing || round.videoSrc) return
    let previous = performance.now()
    const interval = window.setInterval(() => {
      const now = performance.now()
      clock.current = Math.min(round.duration, clock.current + (now - previous) / 1000)
      previous = now
      setTime(clock.current)
      if (clock.current >= round.duration) { tapLocked.current = true; setPhase('ending') }
    }, 50)
    return () => window.clearInterval(interval)
  }, [playing, round])
  useEffect(() => {
    if (phase !== 'submitted' && phase !== 'ending') return
    const timer = window.setTimeout(() => {
      if (phase === 'submitted') { setFeedback(null); setPhase('ending') }
      else {
        const next = previewResult(round, selection)
        setResults(previous => [...previous.filter(item => item.roundId !== round.id), next])
        setPhase('results')
      }
    }, phase === 'submitted' ? 1100 : 900)
    return () => window.clearTimeout(timer)
  }, [phase, round, selection])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [message])

  const resetRound = (index: 0 | 1) => {
    setRoundIndex(index); setPhase('intro'); setCountdown(3); setTime(0); clock.current = 0
    setPaused(false); setSelection(null); setFeedback(null); setMessage(''); setMediaError(false); tapLocked.current = false
  }
  const start = () => {
    setCountdown(3); setPhase('countdown')
    stageArea.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
  const tap = (point: Point, timestamp: number) => {
    if (!playing || tapLocked.current) return
    const chosen = submitPreviewTap(round, point, timestamp)
    if (!chosen) { setMessage('No swimmer selected. Tap directly on a swimmer.'); return }
    tapLocked.current = true
    setSelection(chosen); setFeedback(point); setPhase('submitted'); setMessage('')
  }
  const onMediaError = useCallback(() => { setMediaError(true); setPaused(true) }, [])
  const onTime = (value: number) => { clock.current = value; setTime(value) }
  const end = () => { tapLocked.current = true; setPhase('ending') }
  const inPlay = ['countdown', 'active', 'submitted', 'ending'].includes(phase)

  return (
    <div className="demo-page" data-phase={phase}>
      <a className="skip-link" href="#demo-main">Skip to challenge</a>
      <SiteHeader currentPage="demo" />
      <main id="demo-main" className="demo-main">
        <div className="demo-heading-row">
          <div><p className="demo-eyebrow">A fresh perspective on pool safety</p><h1>Human <em>vs</em> AI</h1></div>
          <div className="demo-round-label"><span>{phase === 'complete' ? 'Challenge complete' : `Round ${roundIndex + 1} of 2`}</span><div className="demo-round-dots" aria-hidden="true"><i className="is-current" /><i className={roundIndex === 1 ? 'is-current' : ''} /></div></div>
        </div>

        {phase !== 'results' && phase !== 'complete' && <>
          <div className="demo-stage-heading">
            <p>{phase === 'intro' ? 'Two rounds. One extra layer of attention.' : 'See someone in distress? Tap them.'}</p>
            <span className="demo-preview-label">Illustrated preview</span>
          </div>
          <div ref={stageArea}>
            <PoolStage key={round.id} round={round} time={time} active={playing} playing={playing} feedback={feedback}
              onTap={tap} onTime={onTime} onEnded={end} onMediaError={onMediaError}>
              {phase === 'intro' && <div className="demo-stage-overlay demo-intro-overlay">
                <div className="demo-intro-copy"><p className="demo-eyebrow">{roundIndex === 0 ? 'Start with the essentials' : 'A busier scene'}</p>
                  <h2>{round.title}</h2><p>{round.description}</p>
                  <p className="demo-instruction">Watch the pool. Spot signs of distress.<br />Tap the swimmer before Lifeguard AI does.</p>
                  <button className="demo-button" onClick={start}>Start Round <span aria-hidden="true">↗</span></button>
                  <p className="demo-preview-note">Interactive illustration & sample results.<br />Real pool footage is not connected yet.</p>
                </div>
              </div>}
              {phase === 'countdown' && !paused && <div className="demo-stage-overlay demo-countdown" role="status"><p>Eyes on the water</p><strong key={countdown}>{countdown}</strong><span>Get ready to tap a swimmer.</span></div>}
              {paused && inPlay && <div className="demo-stage-overlay demo-pause"><h2>{mediaError ? 'The clip couldn’t play.' : 'Take a moment.'}</h2><p>{mediaError ? 'Return to the round introduction and try again.' : 'Your round is paused. Pick up when you’re ready.'}</p><button className="demo-button" onClick={() => mediaError ? resetRound(roundIndex) : setPaused(false)}>{mediaError ? 'Return to round' : 'Resume round'}</button></div>}
              {phase === 'submitted' && <div className="demo-stage-toast" role="status">Selection recorded</div>}
              {phase === 'ending' && <div className="demo-stage-overlay demo-ending" role="status"><p className="demo-eyebrow">Round complete</p><h2>Let’s take another look.</h2></div>}
            </PoolStage>
          </div>
          <div className="demo-under-stage">
            <p role="status">{message || (phase === 'submitted' ? 'Your tap is saved. The comparison comes next.' : phase === 'intro' ? 'Tap directly on the swimmer. No menus, no numbers.' : 'Your observations first. The AI reveal comes after the round.')}</p>
            {(phase === 'active' || phase === 'countdown') && <button className="demo-text-button" disabled={paused} onClick={() => setPaused(true)}>Pause round</button>}
          </div>
        </>}

        {phase === 'results' && result && <section className="demo-results" aria-labelledby="result-title">
          <p className="demo-eyebrow">Round {roundIndex + 1} · The reveal</p>
          <h2 id="result-title" ref={stateHeading} tabIndex={-1}>{firstLabels[result.first]}</h2>
          <p className="demo-results-note">Illustrative comparison using scripted sample data. Times are measured from the start of the clip.</p>
          <div className="demo-comparison">
            <article><p className="demo-eyebrow">You · Human attention</p><strong className="demo-result-time">{result.human ? result.human.timestamp.toFixed(1) : '—'}{result.human && <small>s</small>}</strong><p>{swimmerDescription(round, result.human?.swimmerId)}</p><span className={`demo-outcome ${result.humanCorrect ? 'is-correct' : ''}`}>{result.humanCorrect ? 'Correct selection' : !result.human ? 'No selection this round' : result.human.timestamp < round.distress.onset && result.human.swimmerId === round.distress.swimmerId ? 'Selected before signs began' : 'Different swimmer selected'}</span></article>
            <article><p className="demo-eyebrow">Lifeguard AI · Sample result</p><strong className="demo-result-time">{round.ai.timestamp.toFixed(1)}<small>s</small></strong><p>{swimmerDescription(round, round.ai.swimmerId)}</p><span className={`demo-outcome ${result.aiCorrect ? 'is-correct' : ''}`}>{result.aiCorrect ? 'Correct selection' : 'Different swimmer selected'}</span></article>
          </div>
          <div className="demo-reveal-detail">
            <PoolStage round={round} time={Math.max(round.distress.onset, selection?.timestamp ?? round.ai.timestamp)} active={false} playing={false} feedback={null} reveal={round.distress.swimmerId} onTap={() => {}} onTime={onTime} onEnded={() => {}} onMediaError={onMediaError} />
            <div><p className="demo-eyebrow">The swimmer who needed attention</p><h3>{swimmerDescription(round, round.distress.swimmerId)}</h3><p>{round.distress.description}</p><p className="demo-preview-note">Sample signs begin at {round.distress.onset.toFixed(1)}s. This illustration is for reviewing the interface, not assessing detection performance.</p></div>
          </div>
          <div className="demo-result-actions"><p>Different strengths. A shared responsibility.</p><button className="demo-button" onClick={() => roundIndex === 0 ? resetRound(1) : setPhase('complete')}>{roundIndex === 0 ? 'Continue to Round 2' : 'Finish challenge'} <span aria-hidden="true">↗</span></button></div>
        </section>}

        {phase === 'complete' && <section className="demo-complete" aria-labelledby="complete-title">
          <p className="demo-eyebrow">Two rounds. One shared purpose.</p>
          <h2 id="complete-title" ref={stateHeading} tabIndex={-1}>Better, <em>together.</em></h2>
          <p className="demo-complete-lead">In the challenge, Human vs AI.<br />At the pool, Human <strong>+ AI.</strong></p>
          <p>Lifeguard AI adds a second layer of attention, helping lifeguards notice swimmers who may need help. Human judgment stays at the heart of every response.</p>
          <div className="demo-summary">{results.map((item, index) => <div key={item.roundId}><span>Round {index + 1}</span><strong>{item.humanCorrect ? 'You identified the swimmer' : item.human ? 'A different observation' : 'No selection recorded'}</strong><span>{item.human ? `${item.human.timestamp.toFixed(1)}s` : '—'}</span></div>)}</div>
          <p className="demo-preview-note">Preview complete. These sample results do not represent real AI performance.</p>
          <div className="demo-complete-actions"><button className="demo-button" onClick={() => { setResults([]); resetRound(0) }}>Try again</button><a className="demo-button demo-button-secondary" href="/">Back to home</a></div>
        </section>}
      </main>
      <footer className="demo-footer"><span>Human attention. An extra layer of care.</span><a href="/">Lifeguard AI <span aria-hidden="true">↗</span></a></footer>
      <svg className="demo-bottom-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 36Q180 0 360 40T720 36T1080 40T1440 24V80H0Z" fill="var(--seafoam)" /><path d="M0 64Q180 22 360 60T720 60T1080 60T1440 48V80H0Z" fill="var(--lagoon)" opacity=".35" /></svg>
    </div>
  )
}
