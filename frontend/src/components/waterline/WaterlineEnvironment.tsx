import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { createWaterlineRenderer } from './renderer'
import type { WaterlineRenderer } from './renderer'
import './WaterlineEnvironment.css'

export function WaterlineEnvironment({ motionActive }: { motionActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderer = useRef<WaterlineRenderer | null>(null)
  const [ready, setReady] = useState(false)
  const lastRipple = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderer.current = createWaterlineRenderer(canvas, setReady)
    return () => { renderer.current?.dispose(); renderer.current = null }
  }, [])

  useEffect(() => { renderer.current?.setActive(motionActive) }, [motionActive])

  const coordinates = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height }
  }

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!motionActive || event.pointerType === 'touch') return
    const { x, y } = coordinates(event)
    renderer.current?.setPointer(x, y)
    if (y > 0.46 && performance.now() - lastRipple.current > 500) {
      renderer.current?.addRipple(x, y)
      lastRipple.current = performance.now()
    }
  }

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    touchStart.current = { x: event.clientX, y: event.clientY }
  }

  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!motionActive || !touchStart.current) return
    const start = touchStart.current
    touchStart.current = null
    if (Math.hypot(start.x - event.clientX, start.y - event.clientY) > 12) return
    const { x, y } = coordinates(event)
    if (y > 0.46) renderer.current?.addRipple(x, y)
  }

  return (
    <div
      className="waterline-environment"
      data-renderer={ready ? 'webgl' : 'fallback'}
      aria-hidden="true"
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => { touchStart.current = null }}
      onPointerLeave={() => renderer.current?.setPointer(0.5, 0.5)}
    >
      <div className="waterline-poster" />
      <canvas ref={canvasRef} className="waterline-canvas" />
    </div>
  )
}
