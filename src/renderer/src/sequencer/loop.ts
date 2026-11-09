import { GRID_TICKS, PPQ, type NoteEvent, type QuantizeGrid, type Take } from './types'

const MIN_DURATION = PPQ / 16

export interface RecordingSession {
  readonly pending: Readonly<Record<number, { readonly tick: number; readonly velocity: number }>>
  readonly events: readonly NoteEvent[]
}

export interface ScheduledEvent {
  readonly event: NoteEvent
  readonly offsetTicks: number
}

export const wrapTick = (tick: number, loopTicks: number): number => ((tick % loopTicks) + loopTicks) % loopTicks

export function quantizeTick(tick: number, grid: QuantizeGrid, loopTicks: number): number {
  const step = GRID_TICKS[grid]
  return wrapTick(Math.round(tick / step) * step, loopTicks)
}

export const emptySession = (): RecordingSession => ({ pending: {}, events: [] })

export function beginNote(session: RecordingSession, note: number, velocity: number, tick: number): RecordingSession {
  return { ...session, pending: { ...session.pending, [note]: { tick, velocity } } }
}

export function endNote(session: RecordingSession, note: number, tick: number, loopTicks: number): RecordingSession {
  const start = session.pending[note]
  if (!start) return session
  const { [note]: _closed, ...pending } = session.pending
  const event: NoteEvent = {
    tick: start.tick,
    note,
    velocity: start.velocity,
    duration: Math.max(MIN_DURATION, wrapTick(tick - start.tick, loopTicks))
  }
  return { pending, events: [...session.events, event] }
}

/** Fecha as notas ainda seguradas e devolve todos os eventos da sessão. */
export function finishSession(session: RecordingSession, tick: number, loopTicks: number): NoteEvent[] {
  const closed = Object.keys(session.pending)
    .map(Number)
    .reduce((s, note) => endNote(s, note, tick, loopTicks), session)
  return [...closed.events]
}

export function flattenTakes(takes: readonly Take[]): NoteEvent[] {
  return takes.flatMap((t) => t.events).sort((a, b) => a.tick - b.tick)
}

export const removeLastTake = (takes: readonly Take[]): Take[] => takes.slice(0, -1)

/**
 * Eventos que caem em [startTick, endTick). A janela pode passar do fim do loop;
 * nesse caso o começo do loop é considerado como continuação.
 */
export function eventsInWindow(
  events: readonly NoteEvent[],
  startTick: number,
  endTick: number,
  loopTicks: number
): ScheduledEvent[] {
  const start = wrapTick(startTick, loopTicks)
  const length = endTick - startTick
  return events
    .map((event) => ({ event, offsetTicks: wrapTick(event.tick - start, loopTicks) }))
    .filter((s) => s.offsetTicks < length)
    .sort((a, b) => a.offsetTicks - b.offsetTicks)
}
