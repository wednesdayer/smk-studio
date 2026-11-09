import * as Tone from 'tone'
import type { AudioEngine } from './engine'
import { encodeWav } from './wav'

const TAIL_SECONDS = 2

/** Grava o loop tocando `repeats` vezes (mais a cauda do reverb) e devolve um WAV. */
export async function renderLoopToWav(
  engine: AudioEngine,
  loopSeconds: number,
  repeats: number
): Promise<ArrayBuffer> {
  const { transport, recorder } = engine
  transport.stop()
  transport.position = 0

  await recorder.start()
  transport.start('+0.05')
  await wait((loopSeconds * repeats) * 1000)
  transport.stop()
  await wait(TAIL_SECONDS * 1000)
  const blob = await recorder.stop()

  const decoded = await Tone.getContext().rawContext.decodeAudioData(await blob.arrayBuffer())
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i))
  return encodeWav(channels, decoded.sampleRate)
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
