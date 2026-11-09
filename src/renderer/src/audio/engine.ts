import * as Tone from 'tone'
import { PPQ } from '../sequencer/types'

export interface AudioEngine {
  readonly master: Tone.Limiter
  readonly recorder: Tone.Recorder
  readonly transport: ReturnType<typeof Tone.getTransport>
  click(time: number, accent: boolean): void
}

let engine: AudioEngine | null = null
let starting: Promise<AudioEngine> | null = null

/** Inicia o áudio uma única vez, mesmo com chamadas concorrentes. */
export function startAudioEngine(): Promise<AudioEngine> {
  starting ??= initEngine()
  return starting
}

async function initEngine(): Promise<AudioEngine> {
  await Tone.start()
  Tone.getContext().lookAhead = 0.05

  const master = new Tone.Limiter(-1).toDestination()
  // PCM dentro do webm quando suportado: exportação sem perda.
  const pcm = 'audio/webm;codecs=pcm'
  const recorder = new Tone.Recorder(MediaRecorder.isTypeSupported(pcm) ? { mimeType: pcm } : {})
  master.connect(recorder)

  const metronome = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 }
  }).toDestination()
  metronome.volume.value = -10

  const transport = Tone.getTransport()
  transport.PPQ = PPQ

  engine = {
    master,
    recorder,
    transport,
    click: (time, accent) => metronome.triggerAttackRelease(accent ? 1500 : 1000, 0.05, time, accent ? 1 : 0.6)
  }
  return engine
}

export const getAudioEngine = (): AudioEngine | null => engine
