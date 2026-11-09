import type { TrackKind } from '../params'

export interface MixSettings {
  readonly volume: number
  readonly muted: boolean
  readonly solo: boolean
}

/** Contrato comum dos instrumentos. `time` é o tempo do AudioContext (undefined = agora). */
export interface Instrument {
  readonly kind: TrackKind
  noteOn(note: number, velocity: number, time?: number): void
  noteOff(note: number, time?: number): void
  play(note: number, velocity: number, durationSeconds: number, time: number): void
  applyParams(values: readonly number[]): void
  setMix(mix: MixSettings): void
  setPitchBend(value: number): void
  setModWheel(value: number): void
  setPressure(value: number): void
  allNotesOff(): void
  dispose(): void
}
