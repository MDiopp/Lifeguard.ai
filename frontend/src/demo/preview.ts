/** Temporary frontend boundary. Swimmers, motion and AI results are scripted
 * fixtures, not detections. Replace with FastAPI session/tap/result responses.
 * Coordinates are normalized to media dimensions; timestamps are media seconds. */
export type Point = { x: number; y: number }
export type Selection = Point & { swimmerId: string; timestamp: number }
export type Swimmer = Point & { id: string; description: string; color: 'ink' | 'sand' | 'sun' | 'coral'; direction: number }
export type Round = {
  id: string; title: string; description: string; duration: number
  /** Only set together with corresponding time-aligned selection/result data. */
  videoSrc?: string
  swimmers: Swimmer[]
  distress: { swimmerId: string; onset: number; description: string }
  ai: { swimmerId: string; timestamp: number }
}
const swimmers: Swimmer[] = [
  { id: 'a', x: .23, y: .28, direction: 1, color: 'sand', description: 'Swimmer in a cream cap, upper left' },
  { id: 'b', x: .67, y: .34, direction: -1, color: 'coral', description: 'Swimmer in a coral cap, upper right' },
  { id: 'c', x: .43, y: .7, direction: 1, color: 'sun', description: 'Swimmer in a yellow cap, lower middle' },
  { id: 'd', x: .8, y: .72, direction: -1, color: 'ink', description: 'Swimmer in a teal cap, lower right' },
  { id: 'e', x: .35, y: .46, direction: -1, color: 'ink', description: 'Swimmer in a teal cap, middle left' },
  { id: 'f', x: .57, y: .56, direction: 1, color: 'sand', description: 'Swimmer in a cream cap, middle right' },
  { id: 'g', x: .83, y: .22, direction: 1, color: 'sun', description: 'Swimmer in a yellow cap, upper right' },
  { id: 'h', x: .15, y: .65, direction: -1, color: 'coral', description: 'Swimmer in a coral cap, lower left' },
  { id: 'i', x: .48, y: .2, direction: -1, color: 'sand', description: 'Swimmer in a cream cap, upper middle' },
]
// Exactly two rounds. Fixtures exercise the UI, not the effectiveness of AI.
export const previewRounds: readonly [Round, Round] = [
  { id: 'preview-1', title: 'A little less to watch.', description: 'A quieter pool. One swimmer who may need your attention.', duration: 20, swimmers: swimmers.slice(0, 4), distress: { swimmerId: 'b', onset: 5, description: 'Forward movement slows and repeated arm movements begin.' }, ai: { swimmerId: 'b', timestamp: 9.2 } },
  { id: 'preview-2', title: 'More happening. Same attention.', description: 'A busier pool. Watch for a subtler change in movement.', duration: 24, swimmers, distress: { swimmerId: 'f', onset: 8, description: 'Forward movement becomes limited while nearby swimmers continue moving.' }, ai: { swimmerId: 'f', timestamp: 11.4 } },
]
export function frameAt(round: Round, timestamp: number) {
  return round.swimmers.map(swimmer => {
    const affected = swimmer.id === round.distress.swimmerId && timestamp >= round.distress.onset
    const movingTime = affected ? round.distress.onset : timestamp
    return { ...swimmer, x: swimmer.x + Math.sin(movingTime / 9) * .07 * swimmer.direction, affected }
  })
}
export function submitPreviewTap(round: Round, point: Point, timestamp: number): Selection | null {
  // Hit-test authored positions only. Real swimmer resolution belongs on the server.
  const swimmer = frameAt(round, timestamp).find(s => Math.abs(s.x - point.x) <= .035 && Math.abs(s.y - point.y) <= .065)
  return swimmer ? { ...point, swimmerId: swimmer.id, timestamp } : null
}
export type RoundResult = { roundId: string; human: Selection | null; humanCorrect: boolean; aiCorrect: boolean; first: 'human' | 'ai' | 'tie' | 'neither' }
export function previewResult(round: Round, human: Selection | null): RoundResult {
  const humanCorrect = !!human && human.swimmerId === round.distress.swimmerId && human.timestamp >= round.distress.onset
  const aiCorrect = round.ai.swimmerId === round.distress.swimmerId && round.ai.timestamp >= round.distress.onset
  const first = humanCorrect && aiCorrect
    ? Math.abs(human!.timestamp - round.ai.timestamp) < .05 ? 'tie' : human!.timestamp < round.ai.timestamp ? 'human' : 'ai'
    : humanCorrect ? 'human' : aiCorrect ? 'ai' : 'neither'
  return { roundId: round.id, human, humanCorrect, aiCorrect, first }
}
export function swimmerDescription(round: Round, id?: string) {
  return round.swimmers.find(s => s.id === id)?.description ?? 'No swimmer selected'
}
