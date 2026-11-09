import * as Tone from 'tone'
import { DRUM_PARAMS } from '../params'
import { DRUM_VOICE_FACTORIES, type DrumShape, type LevelGroup } from './drumVoices'
import { applyMix } from './mix'
import type { Instrument } from './types'

const PRESSURE_MIN_RATIO = 0.06
const PRESSURE_MAX_Q = 8
/** Vozes do Tone são monofônicas: dois disparos no mesmo instante geram erro. */
const MIN_RETRIGGER_SECONDS = 0.002

/**
 * Bateria de 8 pads: vozes -> grupos de nível -> saturação -> filtro -> reverb -> canal.
 * A pressão nos pads fecha o filtro (efeito "abafar" enquanto você aperta).
 */
export function createDrumInstrument(output: Tone.InputNode): Instrument {
  const drive = new Tone.Distortion({ distortion: 0, wet: 1 })
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 15000, Q: 0.7 })
  const reverb = new Tone.Reverb({ decay: 1.6, wet: 0.1 })
  const channel = new Tone.Channel()
  drive.chain(filter, reverb, channel)
  channel.connect(output)

  const groups: Record<LevelGroup, Tone.Gain> = {
    kick: new Tone.Gain(0.8).connect(drive),
    snare: new Tone.Gain(0.8).connect(drive),
    cymbals: new Tone.Gain(0.7).connect(drive)
  }
  const voices = DRUM_VOICE_FACTORIES.map((f) => f.create(groups[f.group]))

  let shape: DrumShape = { pitch: 1, length: 1 }
  let baseCutoff = 15000
  let pressure = 0

  const updateCutoff = () => {
    const ratio = 1 - (1 - PRESSURE_MIN_RATIO) * pressure
    filter.frequency.rampTo(baseCutoff * ratio, 0.02)
    filter.Q.rampTo(0.7 + PRESSURE_MAX_Q * pressure, 0.02)
  }

  let lastTimes: readonly number[] = voices.map(() => -Infinity)
  const trigger = (index: number, velocity: number, time?: number) => {
    const voice = voices[index]
    if (!voice) return
    const at = Math.max(time ?? Tone.now(), lastTimes[index] + MIN_RETRIGGER_SECONDS)
    lastTimes = lastTimes.map((t, i) => (i === index ? at : t))
    voice.trigger(at, velocity, shape)
  }

  return {
    kind: 'drums',
    noteOn: (note, velocity, time) => trigger(note, velocity, time),
    noteOff: () => {
      // Sons de bateria são one-shot: soltar o pad não corta o som.
    },
    play: (note, velocity, _duration, time) => trigger(note, velocity, time),
    applyParams(values) {
      const v = (i: number) => DRUM_PARAMS[i].toValue(values[i])
      shape = { pitch: Math.pow(2, v(0) / 12), length: v(1) }
      baseCutoff = v(2)
      drive.distortion = v(3)
      groups.kick.gain.rampTo(v(4), 0.03)
      groups.snare.gain.rampTo(v(5), 0.03)
      groups.cymbals.gain.rampTo(v(6), 0.03)
      reverb.wet.rampTo(v(7), 0.05)
      updateCutoff()
    },
    setMix: (mix) => applyMix(channel, mix),
    setPitchBend: () => undefined,
    setModWheel: () => undefined,
    setPressure(value) {
      pressure = value
      updateCutoff()
    },
    allNotesOff() {
      pressure = 0
      updateCutoff()
    },
    dispose() {
      voices.forEach((voice) => voice.dispose())
      Object.values(groups).forEach((g) => g.dispose())
      ;[drive, filter, reverb, channel].forEach((node) => node.dispose())
    }
  }
}
