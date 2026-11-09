import * as Tone from 'tone'

/** Contexto de som atual da bateria, calculado a partir dos knobs. */
export interface DrumShape {
  readonly pitch: number
  readonly length: number
}

export interface DrumVoice {
  trigger(time: number, velocity: number, shape: DrumShape): void
  dispose(): void
}

export type LevelGroup = 'kick' | 'snare' | 'cymbals'

function membrane(output: Tone.InputNode, baseHz: number, decay: number, octaves: number): DrumVoice {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves,
    envelope: { attack: 0.001, decay, sustain: 0, release: 0.05 }
  }).connect(output)
  return {
    trigger(time, velocity, shape) {
      synth.envelope.decay = decay * shape.length
      synth.triggerAttackRelease(baseHz * shape.pitch, decay * shape.length, time, velocity)
    },
    dispose: () => synth.dispose()
  }
}

function noise(output: Tone.InputNode, decay: number, bandHz?: number): DrumVoice {
  const synth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay, sustain: 0 } })
  const band = bandHz ? new Tone.Filter({ type: 'bandpass', frequency: bandHz, Q: 1.2 }) : null
  if (band) synth.chain(band, output)
  else synth.connect(output)
  return {
    trigger(time, velocity, shape) {
      synth.envelope.decay = decay * shape.length
      band?.frequency.setValueAtTime((bandHz ?? 1000) * shape.pitch, time)
      synth.triggerAttackRelease(decay * shape.length, time, velocity)
    },
    dispose: () => {
      synth.dispose()
      band?.dispose()
    }
  }
}

function metal(output: Tone.InputNode, decay: number): DrumVoice {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 5000,
    octaves: 1.5
  }).connect(output)
  synth.volume.value = -14
  return {
    trigger(time, velocity, shape) {
      synth.envelope.decay = decay * shape.length
      synth.triggerAttackRelease(300 * shape.pitch, decay * shape.length, time, velocity)
    },
    dispose: () => synth.dispose()
  }
}

function snare(output: Tone.InputNode): DrumVoice {
  const body = membrane(output, 185, 0.12, 2)
  const rattle = noise(output, 0.18)
  return {
    trigger(time, velocity, shape) {
      body.trigger(time, velocity * 0.7, shape)
      rattle.trigger(time, velocity, shape)
    },
    dispose: () => {
      body.dispose()
      rattle.dispose()
    }
  }
}

function rim(output: Tone.InputNode): DrumVoice {
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 }
  }).connect(output)
  return {
    trigger(time, velocity, shape) {
      synth.triggerAttackRelease(1700 * shape.pitch, 0.03 * shape.length, time, velocity)
    },
    dispose: () => synth.dispose()
  }
}

/** Os 8 sons dos pads, na ordem física (pad 1 = bumbo). */
export const DRUM_VOICE_FACTORIES: readonly { group: LevelGroup; create: (out: Tone.InputNode) => DrumVoice }[] = [
  { group: 'kick', create: (out) => membrane(out, 50, 0.45, 6) },
  { group: 'snare', create: snare },
  { group: 'cymbals', create: (out) => metal(out, 0.06) },
  { group: 'cymbals', create: (out) => metal(out, 0.45) },
  { group: 'snare', create: (out) => noise(out, 0.16, 1400) },
  { group: 'kick', create: (out) => membrane(out, 95, 0.35, 3) },
  { group: 'kick', create: (out) => membrane(out, 160, 0.28, 3) },
  { group: 'snare', create: rim }
]
