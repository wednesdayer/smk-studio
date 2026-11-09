import type * as Tone from 'tone'
import type { Track } from '../state/project'
import { createDrumInstrument } from './instruments/drumInstrument'
import { createSynthInstrument } from './instruments/synthInstrument'
import type { Instrument } from './instruments/types'

interface Slot {
  readonly instrument: Instrument
  params: readonly number[] | null
  mixKey: string
}

/** Mantém um instrumento por faixa e sincroniza com o estado do projeto. */
export class InstrumentRack {
  private readonly slots = new Map<string, Slot>()

  constructor(private readonly output: Tone.InputNode) {}

  get(trackId: string): Instrument | undefined {
    return this.slots.get(trackId)?.instrument
  }

  sync(tracks: readonly Track[]): void {
    const ids = new Set(tracks.map((t) => t.id))
    for (const [id, slot] of this.slots) {
      if (!ids.has(id)) {
        slot.instrument.dispose()
        this.slots.delete(id)
      }
    }
    tracks.forEach((track) => this.syncTrack(track))
  }

  allNotesOff(): void {
    this.slots.forEach((slot) => slot.instrument.allNotesOff())
  }

  dispose(): void {
    this.slots.forEach((slot) => slot.instrument.dispose())
    this.slots.clear()
  }

  private syncTrack(track: Track): void {
    const slot = this.slots.get(track.id) ?? this.create(track)
    if (slot.params !== track.params) {
      slot.instrument.applyParams(track.params)
      slot.params = track.params
    }
    const mixKey = `${track.volume}|${track.muted}|${track.solo}`
    if (slot.mixKey !== mixKey) {
      slot.instrument.setMix({ volume: track.volume, muted: track.muted, solo: track.solo })
      slot.mixKey = mixKey
    }
  }

  private create(track: Track): Slot {
    const instrument =
      track.kind === 'synth' ? createSynthInstrument(this.output) : createDrumInstrument(this.output)
    const slot: Slot = { instrument, params: null, mixKey: '' }
    this.slots.set(track.id, slot)
    return slot
  }
}
