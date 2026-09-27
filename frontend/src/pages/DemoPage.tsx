import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { PoolStage } from '../demo/PoolStage'
import './DemoPage.css'

type Phase = 'intro' | 'countdown' | 'active' | 'submitted' | 'ending' | 'results' | 'complete'
type RoundStart = {
  round_id: string
  video_id: string
  difficulty: 'easy' | 'hard'
  video_url: string
  ai_answer_time: number
}
type RoundResult = {
  round_id: string
  video_id: string
  ai: { time: number; correct: true }
  human: { time: number; correct: boolean; answer: string } | null
  first: 'human' | 'ai' | 'tie'
}

const rounds = [
  { videoId: 'easy_01', title: 'Start with the clear signs.', description: 'Watch closely and describe the person you believe needs attention.' },
  { videoId: 'hard_01', title: 'Now the water gets busier.', description: 'The change is subtler this time. Stay focused on the whole pool.' },
] as const

const winnerCopy = {
  human: 'You noticed first.',
  ai: 'Lifeguard AI noticed first.',
  tie: 'A shared moment of attention.',
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export default function DemoPage() {
  const [roundIndex, setRoundIndex] = useState<0 | 1>(0)
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [round, setRound] = useState<RoundStart | null>(null)
  const [time, setTime] = useState(0)
  const [paused, setPaused] = useState(false)
  const [answer, setAnswer] = useState('')
  const [humanStartedAt, setHumanStartedAt] = useState<number | null>(null)
  const [humanSubmitted, setHumanSubmitted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [message, setMessage] = useState('')
  const [starting, setStarting] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const ending = useRef(false)
  const stateHeading = useRef<HTMLHeadingElement>(null)
  const config = rounds[roundIndex]
  const playing = (phase === 'active' || phase === 'submitted') && !paused && !mediaError

  useEffect(() => { document.title = 'Human vs AI — Lifeguard AI' }, [])
  useEffect(() => {
    if (phase === 'results' || phase === 'complete') stateHeading.current?.focus()
  }, [phase])
  useEffect(() => {
    if (phase !== 'countdown' || paused) return
    const timer = window.setTimeout(() => {
      if (countdown === 1) setPhase('active')
      else setCountdown(value => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, paused, phase])

  const finishRound = useCallback(async () => {
    if (!round || !humanSubmitted || ending.current) return
    ending.current = true
    setPaused(false)
    setPhase('ending')
    try {
      const next = await api<RoundResult>(`/api/demo/rounds/${round.round_id}/result`)
      setResult(next)
      setResults(previous => [...previous.filter(item => item.video_id !== next.video_id), next])
      window.setTimeout(() => setPhase('results'), 700)
    } catch (error) {
      ending.current = false
      setPhase(humanSubmitted ? 'submitted' : 'active')
      setMessage(error instanceof Error ? error.message : 'The result could not be loaded.')
    }
  }, [humanSubmitted, round])

  useEffect(() => {
    if (!round || !humanSubmitted || time < round.ai_answer_time) return
    void finishRound()
  }, [finishRound, humanSubmitted, round, time])

  function resetRound(index: 0 | 1) {
    setRoundIndex(index)
    setPhase('intro')
    setCountdown(3)
    setRound(null)
    setTime(0)
    setPaused(false)
    setAnswer('')
    setHumanStartedAt(null)
    setHumanSubmitted(false)
    setChecking(false)
    setResult(null)
    setMessage('')
    setStarting(false)
    setMediaError(false)
    ending.current = false
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  async function startRound() {
    setStarting(true)
    setMessage('')
    try {
      const started = await api<RoundStart>(`/api/demo/rounds/${config.videoId}/start`, { method: 'POST' })
      setRound(started)
      setCountdown(3)
      setPhase('countdown')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The round could not start.')
    } finally {
      setStarting(false)
    }
  }

  function recordTyping(next: string) {
    if (humanStartedAt === null && next.trim().length > 0) setHumanStartedAt(time)
    setAnswer(next)
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault()
    if (!round || !answer.trim() || humanStartedAt === null || checking || humanSubmitted) return
    setChecking(true)
    setMessage('')
    try {
      await api(`/api/demo/rounds/${round.round_id}/human-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim(), started_at: humanStartedAt }),
      })
      setHumanSubmitted(true)
      setPhase('submitted')
      setMessage('Answer recorded. Keep watching while the round finishes.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your answer could not be checked.')
    } finally {
      setChecking(false)
    }
  }

  function handleVideoEnded() {
    if (humanSubmitted) {
      void finishRound()
      return
    }
    setMessage('The clip has ended. Submit your answer to complete the round.')
  }

  const inRound = phase === 'countdown' || phase === 'active' || phase === 'submitted' || phase === 'ending'

  return (
    <div className="demo-page" data-phase={phase}>
      <a className="skip-link" href="#demo-main">Skip to challenge</a>
      <SiteHeader currentPage="demo" />
      <main id="demo-main" className="demo-main">
        <div className="demo-heading-row">
          <div><p className="demo-eyebrow">Two ways of watching the water</p><h1>Human <em>vs</em> AI</h1></div>
          <div className="demo-round-label"><span>{phase === 'complete' ? 'Challenge complete' : `Round ${roundIndex + 1} of 2`}</span><div className="demo-round-dots" aria-hidden="true"><i className="is-current" /><i className={roundIndex === 1 ? 'is-current' : ''} /></div></div>
        </div>

        {phase !== 'results' && phase !== 'complete' && <>
          <div className="demo-stage-heading"><p>{phase === 'intro' ? config.description : 'See someone in distress? Describe them as soon as you notice.'}</p><span className="demo-live-label">Pool footage</span></div>
          <PoolStage key={round?.round_id || config.videoId} src={round?.video_url} playing={playing} onTime={setTime} onEnded={handleVideoEnded} onMediaError={() => { setMediaError(true); setPaused(true) }}>
            {phase === 'intro' && <div className="demo-stage-overlay demo-intro-overlay"><div className="demo-intro-copy"><p className="demo-eyebrow">Round {roundIndex + 1}</p><h2>{config.title}</h2><p>When you recognize the person, begin typing a short description. Your time is captured on the first character.</p><button className="demo-button" disabled={starting} onClick={() => void startRound()}>{starting ? 'Preparing…' : 'Start Round'} <span aria-hidden="true">↗</span></button></div></div>}
            {phase === 'countdown' && !paused && <div className="demo-stage-overlay demo-countdown" role="status"><p>Eyes on the water</p><strong key={countdown}>{countdown}</strong><span>Describe the swimmer when you notice them.</span></div>}
            {paused && inRound && <div className="demo-stage-overlay demo-pause"><h2>{mediaError ? 'The clip could not play.' : 'Round paused.'}</h2><p>{mediaError ? 'Return to the round and try again.' : 'Resume when you are ready.'}</p><button className="demo-button" onClick={() => mediaError ? resetRound(roundIndex) : setPaused(false)}>{mediaError ? 'Return to round' : 'Resume round'}</button></div>}
            {phase === 'ending' && <div className="demo-stage-overlay demo-ending" role="status"><p className="demo-eyebrow">Round complete</p><h2>Comparing both answers.</h2></div>}
          </PoolStage>

          {(phase === 'active' || phase === 'submitted') && <form className="demo-answer" onSubmit={submitAnswer}><label htmlFor="human-answer"><span>Your answer</span><small>Your timer starts with your first character.</small></label><div><input id="human-answer" autoComplete="off" maxLength={240} disabled={humanSubmitted} value={answer} onChange={event => recordTyping(event.target.value)} placeholder="Describe the person…" /><button className="demo-button" disabled={!answer.trim() || checking || humanSubmitted}>{checking ? 'Checking…' : humanSubmitted ? 'Recorded' : 'Submit answer'}</button></div></form>}

          <div className="demo-under-stage"><p role="status">{message || (phase === 'intro' ? 'Two clips. One clear decision each round.' : phase === 'countdown' ? 'Get ready.' : humanSubmitted ? 'Your answer is locked.' : 'Keep the description short and specific.')}</p>{(phase === 'active' || phase === 'submitted') && <button className="demo-text-button" onClick={() => setPaused(value => !value)}>{paused ? 'Resume round' : 'Pause round'}</button>}</div>
        </>}

        {phase === 'results' && result && round && <section className="demo-results" aria-labelledby="result-title">
          <p className="demo-eyebrow">Round {roundIndex + 1} · The reveal</p><h2 id="result-title" ref={stateHeading} tabIndex={-1}>{winnerCopy[result.first]}</h2><p className="demo-results-note">Times are measured from the start of the clip.</p>
          <div className="demo-comparison"><article className={result.first === 'human' ? 'is-winner' : undefined}><p className="demo-eyebrow">You · Human attention</p><strong className="demo-result-time">{result.human ? result.human.time.toFixed(2) : '—'}{result.human && <small>s</small>}</strong><p>{result.human?.answer || 'No answer submitted'}</p><span className={`demo-outcome ${result.human?.correct ? 'is-correct' : ''}`}>{result.human?.correct ? 'Correct answer' : result.human ? 'Different person described' : 'No answer this round'}</span></article><article className={result.first === 'ai' ? 'is-winner' : undefined}><p className="demo-eyebrow">Lifeguard AI</p><strong className="demo-result-time">{result.ai.time.toFixed(2)}<small>s</small></strong><p>Possible distress detected</p><span className="demo-outcome is-correct">Correct detection</span></article></div>
          <div className="demo-reveal-detail"><video src={round.video_url} controls muted playsInline preload="metadata" /><div><p className="demo-eyebrow">Round replay</p><h3>Review the moment.</h3><p>Compare when you responded with the AI detection time.</p></div></div>
          <div className="demo-result-actions"><p>Different strengths. One shared purpose.</p><button className="demo-button" onClick={() => roundIndex === 0 ? resetRound(1) : setPhase('complete')}>{roundIndex === 0 ? 'Continue to Round 2' : 'Finish challenge'} <span aria-hidden="true">↗</span></button></div>
        </section>}

        {phase === 'complete' && <section className="demo-complete" aria-labelledby="complete-title"><p className="demo-eyebrow">Two rounds complete</p><h2 id="complete-title" ref={stateHeading} tabIndex={-1}>Better, <em>together.</em></h2><p className="demo-complete-lead">In the challenge, Human vs AI.<br />At the pool, Human <strong>+ AI.</strong></p><div className="demo-summary">{results.map((item, index) => <div key={item.round_id}><span>Round {index + 1}</span><strong>{winnerCopy[item.first]}</strong><span>{item.human?.correct ? `${item.human.time.toFixed(2)}s` : 'AI result'}</span></div>)}</div><div className="demo-complete-actions"><button className="demo-button" onClick={() => { setResults([]); resetRound(0) }}>Try again</button><a className="demo-button demo-button-secondary" href="/">Back to home</a></div></section>}
      </main>
      <footer className="demo-footer"><span>Human attention. An extra layer of care.</span><a href="/">Lifeguard AI <span aria-hidden="true">↗</span></a></footer>
      <svg className="demo-bottom-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 36Q180 0 360 40T720 36T1080 40T1440 24V80H0Z" fill="var(--seafoam)" /><path d="M0 64Q180 22 360 60T720 60T1080 60T1440 48V80H0Z" fill="var(--lagoon)" opacity=".35" /></svg>
    </div>
  )
}
