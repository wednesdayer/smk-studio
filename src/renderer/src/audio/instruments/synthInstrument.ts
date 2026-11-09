import * as Tone from 'tone'
import { SYNTH_PARAMS, WAVEFORMS } from '../params'
import { applyMix } from './mix'
import type { Instrument } from './types'

const PITCH_BEND_CENTS = 200
const MAX_VIBRATO_DEPTH = 0.4
const MAX_VOICES = 12

const freq = (note: number) => Tone.Frequency(note, 'midi').toFrequency()

/** Synth polifônico: oscilador -> filtro -> vibrato -> reverb -> canal. */
export function createSynthInstrument(output: Tone.InputNode): Instrument {
  const synth = new Tone.PolySynth(Tone.Synth, { maxPolyphony: MAX_VOICES } as Partial<Tone.SynthOptions>)
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 8000, Q: 1 })
  const vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0 })
  const reverb = new Tone.Reverb({ decay: 2.8, wet: 0.2 })
  const channel = new Tone.Channel()
  synth.chain(filter, vibrato, reverb, channel)
  channel.connect(output)

  const held = new Set<number>()

  return {
    kind: 'synth',
    noteOn(note, velocity, time) {
      held.add(note)
      synth.triggerAttack(freq(note), time, velocity)
    },
    noteOff(note, time) {
      held.delete(note)
      synth.triggerRelease(freq(note), time)
    },
    play(note, velocity, duration, time) {
      synth.triggerAttackRelease(freq(note), duration, time, velocity)
    },
    applyParams(values) {
      const v = (i: number) => SYNTH_PARAMS[i].toValue(values[i])
      synth.set({
        oscillator: { type: WAVEFORMS[v(0)] },
        envelope: { attack: v(3), decay: v(4), sustain: v(5), release: v(6) }
      } as Partial<Tone.SynthOptions>)
      filter.frequency.rampTo(v(1), 0.03)
      filter.Q.rampTo(v(2), 0.03)
      reverb.wet.rampTo(v(7), 0.05)
    },
    setMix: (mix) => applyMix(channel, mix),
    setPitchBend(value) {
      synth.set({ detune: value * PITCH_BEND_CENTS })
    },
    setModWheel(value) {
      vibrato.depth.rampTo(value * MAX_VIBRATO_DEPTH, 0.03)
    },
    setPressure() {
      // Teclas do SMK25 não mandam aftertouch; nada a fazer.
    },
    allNotesOff() {
      held.clear()
      synth.releaseAll()
    },
    dispose() {
      ;[synth, filter, vibrato, reverb, channel].forEach((node) => node.dispose())
    }
  }
}
