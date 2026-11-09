import { createStore } from 'zustand/vanilla'
import type { ControllerEvent } from '../controller/events'

export interface MidiStatus {
  readonly state: 'pending' | 'connected' | 'disconnected' | 'unsupported' | 'error'
  readonly ports: readonly string[]
  readonly message: string
}

/** Estado efêmero só para a tela reagir ao hardware (não vai para o arquivo do projeto). */
export interface LiveState {
  readonly keys: ReadonlySet<number>
  readonly pads: ReadonlySet<number>
  readonly padPressure: number
  readonly pitchBend: number
  readonly modWheel: number
  readonly touchedKnob: { readonly index: number; readonly at: number } | null
  readonly midi: MidiStatus
  readonly audioReady: boolean
}

const toggle = (set: ReadonlySet<number>, value: number, on: boolean): ReadonlySet<number> => {
  const next = new Set(set)
  if (on) next.add(value)
  else next.delete(value)
  return next
}

export function reduceLive(state: LiveState, event: ControllerEvent, now: number): LiveState {
  switch (event.kind) {
    case 'key':
      return { ...state, keys: toggle(state.keys, event.note, event.on) }
    case 'pad':
      return { ...state, pads: toggle(state.pads, event.index, event.on), padPressure: event.on ? state.padPressure : 0 }
    case 'padPressure':
      return { ...state, padPressure: event.value }
    case 'pitchBend':
      return { ...state, pitchBend: event.value }
    case 'modWheel':
      return { ...state, modWheel: event.value }
    case 'knob':
      return { ...state, touchedKnob: { index: event.index, at: now } }
    case 'button':
      return state
  }
}

export const initialLiveState: LiveState = {
  keys: new Set(),
  pads: new Set(),
  padPressure: 0,
  pitchBend: 0,
  modWheel: 0,
  touchedKnob: null,
  midi: { state: 'pending', ports: [], message: 'Procurando o SMK25...' },
  audioReady: false
}

export const liveStore = createStore<LiveState>()(() => initialLiveState)
