import * as Tone from 'tone'
import type { MixSettings } from './types'

/** Volume 0..1 do fader para dB, com curva quadrática (mais natural ao ouvido). */
export const volumeToDb = (volume: number): number => (volume <= 0 ? -Infinity : Tone.gainToDb(volume * volume))

export function applyMix(channel: Tone.Channel, mix: MixSettings): void {
  channel.volume.rampTo(volumeToDb(mix.volume), 0.05)
  channel.mute = mix.muted
  channel.solo = mix.solo
}
