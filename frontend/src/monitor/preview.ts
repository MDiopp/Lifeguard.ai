import type { IllustratedSwimmer } from '../components/PoolIllustration'

export type MonitoringState = 'monitoring' | 'possible-distress' | 'critical'
export type Camera = {
  id: string
  name: string
  zone: string
  source: { kind: 'illustration' } | { kind: 'video'; src: string }
}
export type AttentionEvent = {
  id: string
  cameraId: string
  trackId: string
  description: string
  location: string
  observedForSeconds: number
  detectedAtSeconds: number
  signals: string[]
  /** Normalized media coordinates, supplied by tracking, never inferred by UI. */
  bounds: { x: number; y: number; width: number; height: number }
}
export type MonitoringSnapshot = {
  state: MonitoringState
  cameraId: string
  frameSeconds: number
  event: AttentionEvent | null
}

// One source only. Future camera records can use the same shape without a grid.
export const previewCamera: Camera = {
  id: 'pool-deck-1', name: 'Pool Deck 1', zone: 'Deep End', source: { kind: 'illustration' },
}
export const previewSwimmers: IllustratedSwimmer[] = [
  { id: 's-01', x: .24, y: .27, direction: 1, color: 'sand' },
  { id: 's-04', x: .66, y: .34, direction: -1, color: 'coral' },
  { id: 's-07', x: .42, y: .7, direction: 1, color: 'sun' },
  { id: 's-09', x: .81, y: .72, direction: -1, color: 'ink' },
  { id: 's-12', x: .25, y: .56, direction: -1, color: 'sand' },
]
const sampleEvent: AttentionEvent = {
  id: 'sample-attention-001', cameraId: previewCamera.id, trackId: 'S-04',
  description: 'Swimmer in a coral cap', location: 'Upper-right area · Deep End',
  observedForSeconds: 7.2, detectedAtSeconds: 18.4,
  signals: ['Limited forward movement', 'Sustained vertical posture'],
  bounds: { x: .615, y: .275, width: .09, height: .13 },
}
/** Authored sample events, not a detector. Replace this boundary with FastAPI /
 * WebSocket snapshots, including source freshness, alert IDs and normalized boxes. */
export const previewSnapshots: Record<MonitoringState, MonitoringSnapshot> = {
  monitoring: { state: 'monitoring', cameraId: previewCamera.id, frameSeconds: 10, event: null },
  'possible-distress': { state: 'possible-distress', cameraId: previewCamera.id, frameSeconds: 18.4, event: sampleEvent },
  critical: { state: 'critical', cameraId: previewCamera.id, frameSeconds: 25.8, event: { ...sampleEvent, observedForSeconds: 14.6, signals: [...sampleEvent.signals, 'Irregular arm movement continues'] } },
}
export const monitoringLabels: Record<MonitoringState, string> = {
  monitoring: 'Monitoring', 'possible-distress': 'Possible distress', critical: 'Critical attention',
}
export function mediaTimestamp(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`
}
