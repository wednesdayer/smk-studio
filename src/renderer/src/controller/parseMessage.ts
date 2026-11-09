import type { ControllerEvent } from './events'
import {
  KNOB_CCS,
  KNOB_MIN_VALUES,
  MOD_WHEEL_CC,
  PAD_NOTES,
  PADS_CHANNEL,
  TRANSPORT_BUTTONS,
  type PortRole
} from './smk25Profile'
import { normalize7bit, rescalePadVelocity } from './velocity'

const NOTE_OFF = 0x80
const NOTE_ON = 0x90
const CONTROL_CHANGE = 0xb0
const CHANNEL_PRESSURE = 0xd0
const PITCH_BEND = 0xe0
const PITCH_CENTER = 8192

type Bytes = ArrayLike<number>

/** Traduz bytes MIDI crus de uma porta do SMK25 em um evento com significado. */
export function parseMessage(role: PortRole, data: Bytes): ControllerEvent | null {
  if (data.length < 2) return null
  if (role === 'transport') return parseTransport(data)
  if (role === 'main' || role === 'bluetooth') return parseMain(data)
  return null
}

function parseTransport(data: Bytes): ControllerEvent | null {
  const status = data[0] & 0xf0
  if (status !== NOTE_ON && status !== NOTE_OFF) return null
  const button = TRANSPORT_BUTTONS[data[1]]
  if (!button) return null
  const pressed = status === NOTE_ON && (data[2] ?? 0) > 0
  return { kind: 'button', button, pressed }
}

function parseMain(data: Bytes): ControllerEvent | null {
  const status = data[0] & 0xf0
  const channel = data[0] & 0x0f
  switch (status) {
    case NOTE_ON:
    case NOTE_OFF:
      return parseNote(status, channel, data[1], data[2] ?? 0)
    case CONTROL_CHANGE:
      return parseControlChange(data[1], data[2] ?? 0)
    case CHANNEL_PRESSURE:
      return channel === PADS_CHANNEL ? { kind: 'padPressure', value: normalize7bit(data[1]) } : null
    case PITCH_BEND:
      return parsePitchBend(data[1], data[2] ?? 0)
    default:
      return null
  }
}

function parseNote(status: number, channel: number, note: number, rawVelocity: number): ControllerEvent | null {
  const on = status === NOTE_ON && rawVelocity > 0
  if (channel === PADS_CHANNEL) {
    const index = PAD_NOTES.indexOf(note as (typeof PAD_NOTES)[number])
    if (index < 0) return null
    return { kind: 'pad', index, velocity: on ? rescalePadVelocity(rawVelocity) : 0, on }
  }
  return { kind: 'key', note, velocity: on ? normalize7bit(rawVelocity) : 0, on }
}

function parseControlChange(cc: number, value: number): ControllerEvent | null {
  if (cc === MOD_WHEEL_CC) return { kind: 'modWheel', value: normalize7bit(value) }
  const index = KNOB_CCS.indexOf(cc as (typeof KNOB_CCS)[number])
  if (index < 0) return null
  return { kind: 'knob', index, value: normalize7bit(value, KNOB_MIN_VALUES[index]) }
}

function parsePitchBend(lsb: number, msb: number): ControllerEvent {
  const raw = (msb << 7) | lsb
  const value = raw >= PITCH_CENTER ? (raw - PITCH_CENTER) / (16383 - PITCH_CENTER) : (raw - PITCH_CENTER) / PITCH_CENTER
  return { kind: 'pitchBend', value }
}
