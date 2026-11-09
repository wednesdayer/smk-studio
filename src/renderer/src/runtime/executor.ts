import type { InstrumentRack } from '../audio/rack'
import type { Command } from '../controller/router'
import { beginNote, emptySession, endNote, finishSession, quantizeTick, wrapTick, type RecordingSession } from '../sequencer/loop'
import { SkipOnce } from '../sequencer/skipOnce'
import { loopTicksFor, type NoteEvent } from '../sequencer/types'
import { newId } from '../state/project'
import type { AppStoreApi } from '../state/store'

/** Só a parte do Transport do Tone.js que o executor usa (facilita testar). */
export interface TransportLike {
  ticks: number
  position: unknown
  start(time?: number | string): unknown
  stop(time?: number | string): unknown
}

type RackLike = Pick<InstrumentRack, 'get' | 'allNotesOff'>

interface TrackRecording {
  readonly takeId: string
  readonly session: RecordingSession
}

/** Executa os comandos do roteador: toca som, grava, controla transporte. */
export class CommandExecutor {
  private recordings: ReadonlyMap<string, TrackRecording> = new Map()
  /** Para onde foi cada nota segurada, para o note-off ir ao mesmo lugar mesmo trocando de faixa. */
  private heldTargets: ReadonlyMap<string, string> = new Map()
  /** Durante a exportação o transporte fica bloqueado. */
  private locked = false

  constructor(
    private readonly transport: TransportLike,
    private readonly rack: RackLike,
    private readonly store: AppStoreApi,
    readonly skipOnce: SkipOnce = new SkipOnce()
  ) {}

  setLocked(locked: boolean): void {
    this.locked = locked
  }

  run(commands: readonly Command[]): void {
    commands.forEach((command) => {
      if (this.locked && TRANSPORT_COMMANDS.has(command.type)) return this.state.setStatus('Aguarde: exportando...')
      this.execute(command)
    })
  }

  private get state() {
    return this.store.getState()
  }

  private execute(command: Command): void {
    switch (command.type) {
      case 'noteOn':
        return this.noteOn(command.trackId, command.note, command.velocity)
      case 'noteOff':
        return this.noteOff(command.trackId, command.note)
      case 'pressure':
        return this.rack.get(command.trackId)?.setPressure(command.value)
      case 'pitchBend':
        return this.rack.get(command.trackId)?.setPitchBend(command.value)
      case 'modWheel':
        return this.rack.get(command.trackId)?.setModWheel(command.value)
      case 'setParam':
        return this.state.setParam(command.trackId, command.index, command.value)
      case 'play':
        return this.play()
      case 'stop':
        return this.stop()
      case 'toggleRecord':
        return this.toggleRecord()
      case 'undoTake':
        return this.undo(command.trackId)
      case 'toggleMetronome':
        this.state.toggleMetronome()
        return this.state.setStatus(this.state.transport.metronome ? 'Metrônomo ligado' : 'Metrônomo desligado')
      case 'selectRelative':
        return this.state.selectRelative(command.delta)
      case 'selectIndex':
        return this.state.selectTrackByIndex(command.index)
    }
  }

  play(): void {
    if (this.state.transport.playing) return
    this.transport.start('+0.05')
    this.state.setPlaying(true)
    this.state.setStatus('Tocando')
  }

  stop(): void {
    if (!this.state.transport.playing) {
      this.transport.position = 0
      return this.state.setStatus('Voltou ao início')
    }
    this.finishRecordings()
    this.transport.stop()
    this.rack.allNotesOff()
    this.heldTargets = new Map()
    this.state.setPlaying(false)
    this.state.setStatus('Parado')
  }

  toggleRecord(): void {
    if (this.state.transport.recording) {
      this.finishRecordings()
      this.state.setRecording(false)
      return this.state.setStatus('Gravação encerrada')
    }
    this.play()
    this.state.setRecording(true)
    this.state.setStatus('Gravando: toque nas teclas ou nos pads')
  }

  undo(trackId: string): void {
    const track = this.state.project.tracks.find((t) => t.id === trackId)
    if (!track || track.takes.length === 0) return this.state.setStatus('Nada para desfazer nesta faixa')
    this.recordings = without(this.recordings, trackId)
    this.state.undoTake(trackId)
    this.state.setStatus(`Último take de "${track.name}" desfeito`)
  }

  private holdKey(trackId: string, note: number): string {
    const kind = this.state.project.tracks.find((t) => t.id === trackId)?.kind ?? 'synth'
    return `${kind}:${note}`
  }

  private noteOn(trackId: string, note: number, velocity: number): void {
    this.heldTargets = new Map(this.heldTargets).set(this.holdKey(trackId, note), trackId)
    this.rack.get(trackId)?.noteOn(note, velocity)
    this.recordNoteOn(trackId, note, velocity)
  }

  private noteOff(routedTrackId: string, note: number): void {
    const key = this.holdKey(routedTrackId, note)
    const trackId = this.heldTargets.get(key) ?? routedTrackId
    this.heldTargets = without(this.heldTargets, key)
    this.rack.get(trackId)?.noteOff(note)
    this.recordNoteOff(trackId, note)
  }

  private currentTick(): { tick: number; loopTicks: number } {
    const loopTicks = loopTicksFor(this.state.project.loopBars)
    return { tick: wrapTick(this.transport.ticks, loopTicks), loopTicks }
  }

  private recordNoteOn(trackId: string, note: number, velocity: number): void {
    const { transport, project } = this.state
    if (!transport.recording || !transport.playing) return
    const { tick, loopTicks } = this.currentTick()
    const existing = this.recordings.get(trackId) ?? { takeId: newId('take'), session: emptySession() }
    // Note-on repetido sem note-off: fecha a nota anterior em vez de perdê-la.
    const rec = note in existing.session.pending ? this.closeNote(trackId, existing, note) : existing
    const session = beginNote(rec.session, note, velocity, quantizeTick(tick, project.quantize, loopTicks))
    this.recordings = new Map(this.recordings).set(trackId, { ...rec, session })
  }

  private recordNoteOff(trackId: string, note: number): void {
    const rec = this.recordings.get(trackId)
    if (!rec || !(note in rec.session.pending)) return
    this.recordings = new Map(this.recordings).set(trackId, this.closeNote(trackId, rec, note))
  }

  private closeNote(trackId: string, rec: TrackRecording, note: number): TrackRecording {
    const { tick, loopTicks } = this.currentTick()
    const session = endNote(rec.session, note, tick, loopTicks)
    this.commit(trackId, rec.takeId, session.events.slice(rec.session.events.length))
    return { ...rec, session }
  }

  private finishRecordings(): void {
    const { tick, loopTicks } = this.currentTick()
    this.recordings.forEach((rec, trackId) => {
      this.commit(trackId, rec.takeId, finishSession(rec.session, tick, loopTicks).slice(rec.session.events.length))
    })
    this.recordings = new Map()
  }

  private commit(trackId: string, takeId: string, events: readonly NoteEvent[]): void {
    const { tick, loopTicks } = this.currentTick()
    events.forEach((event) => {
      this.skipOnce.markIfAhead(event, tick, loopTicks)
      this.state.recordEvent(trackId, takeId, event)
    })
  }
}

const TRANSPORT_COMMANDS: ReadonlySet<Command['type']> = new Set(['play', 'stop', 'toggleRecord'])

function without<V>(map: ReadonlyMap<string, V>, key: string): ReadonlyMap<string, V> {
  const next = new Map(map)
  next.delete(key)
  return next
}
