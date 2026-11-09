/**
 * Perfil do Midiplus SMK-25 V2, levantado por captura real das mensagens MIDI.
 * Canais aqui são 0-based (canal 1 = 0, canal 10 = 9).
 */

export type PortRole = 'main' | 'duplicate' | 'transport' | 'bluetooth' | 'unknown'

export const KEYS_CHANNEL = 0
export const PADS_CHANNEL = 9
export const MOD_WHEEL_CC = 1
export const KNOB_CCS = [20, 21, 22, 23, 24, 25, 26, 27] as const
/** Knobs 5-8 nunca mandam 0: o mínimo físico deles é 1. */
export const KNOB_MIN_VALUES = [0, 0, 0, 0, 1, 1, 1, 1] as const
export const PAD_NOTES = [36, 37, 38, 39, 40, 41, 42, 43] as const
export const KEY_RANGE = { low: 48, high: 72 } as const

/** Faixa de velocity real dos pads (batida leve até batida forte). */
export const PAD_VELOCITY_RANGE = { min: 30, max: 75 } as const

export type ButtonId =
  | 'stop' | 'play' | 'record'
  | 'rewind' | 'forward'
  | 'up' | 'down'
  | 'track1' | 'track2' | 'track3' | 'track4'

/** Botões que chegam como notas na porta de transporte (padrão Mackie Control). */
export const TRANSPORT_BUTTONS: Readonly<Record<number, ButtonId>> = {
  0: 'track1',
  1: 'track2',
  2: 'track3',
  3: 'track4',
  91: 'rewind',
  92: 'forward',
  93: 'stop',
  94: 'play',
  95: 'record',
  96: 'up',
  97: 'down'
}

export function detectPortRole(portName: string): PortRole {
  const name = portName.trim()
  if (/SMK25V2-bt/i.test(name)) return /-DAW/i.test(name) ? 'unknown' : 'bluetooth'
  if (/MIDIIN2\s*\(SMK25\)/i.test(name)) return 'duplicate'
  if (/MIDIIN3\s*\(SMK25\)/i.test(name)) return 'transport'
  if (/SMK25/i.test(name)) return 'main'
  return 'unknown'
}
