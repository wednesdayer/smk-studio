import { eventsInWindow, flattenTakes } from '../sequencer/loop'
import type { SkipOnce } from '../sequencer/skipOnce'
import { PPQ, loopTicksFor, type NoteEvent, type Take } from '../sequencer/types'
import type { AppStoreApi } from '../state/store'
import type { AudioEngine } from './engine'
import type { InstrumentRack } from './rack'

const STEP_TICKS = PPQ / 4

/** Lê o estado a cada 1/16 e agenda as notas gravadas e o metrônomo com precisão de amostra. */
export function startScheduler(engine: AudioEngine, rack: InstrumentRack, store: AppStoreApi, skipOnce: SkipOnce): () => void {
  const flatCache = new WeakMap<readonly Take[], NoteEvent[]>()
  const eventsOf = (takes: readonly Take[]) => {
    const cached = flatCache.get(takes)
    if (cached) return cached
    const flat = flattenTakes(takes)
    flatCache.set(takes, flat)
    return flat
  }
  let reportedError = false

  const id = engine.transport.scheduleRepeat((time) => {
    const { project, transport, setStatus } = store.getState()
    const loopTicks = loopTicksFor(project.loopBars)
    // getTicksAtTime devolve fração (ex.: 192.0001); sem arredondar, notas e cliques no tempo exato se perdem.
    const startTick = Math.round(engine.transport.getTicksAtTime(time)) % loopTicks
    const secondsPerTick = 60 / project.bpm / PPQ

    if (transport.metronome && startTick % PPQ === 0) {
      engine.click(time, startTick % (PPQ * 4) === 0)
    }

    for (const track of project.tracks) {
      const instrument = rack.get(track.id)
      if (!instrument || track.takes.length === 0) continue
      for (const { event, offsetTicks } of eventsInWindow(eventsOf(track.takes), startTick, startTick + STEP_TICKS, loopTicks)) {
        if (skipOnce.consume(event)) continue
        try {
          instrument.play(event.note, event.velocity, event.duration * secondsPerTick, time + offsetTicks * secondsPerTick)
        } catch (error) {
          // Um instrumento com problema não pode derrubar as outras faixas neste passo.
          if (!reportedError) setStatus(`Falha ao tocar nota em "${track.name}": ${String(error)}`)
          reportedError = true
        }
      }
    }
  }, '16n')

  return () => engine.transport.clear(id)
}

/** Atualiza BPM e loop do Transport só quando mudam (cada escrita cria um evento de tempo no Tone). */
export function createTransportSync(engine: AudioEngine): (bpm: number, loopBars: number) => void {
  let last = { bpm: NaN, loopBars: NaN }
  engine.transport.loop = true
  engine.transport.loopStart = 0
  return (bpm, loopBars) => {
    if (bpm !== last.bpm) engine.transport.bpm.value = bpm
    if (loopBars !== last.loopBars) engine.transport.loopEnd = `${loopBars}m`
    last = { bpm, loopBars }
  }
}
