import type { AppState } from '../state/store'
import type { ControllerEvent } from './events'
import type { ButtonId } from './smk25Profile'

/** Comandos de alto nível que o app executa em resposta ao controlador. */
export type Command =
  | { type: 'noteOn'; trackId: string; note: number; velocity: number }
  | { type: 'noteOff'; trackId: string; note: number }
  | { type: 'pressure'; trackId: string; value: number }
  | { type: 'pitchBend'; trackId: string; value: number }
  | { type: 'modWheel'; trackId: string; value: number }
  | { type: 'setParam'; trackId: string; index: number; value: number }
  | { type: 'play' }
  | { type: 'stop' }
  | { type: 'toggleRecord' }
  | { type: 'undoTake'; trackId: string }
  | { type: 'toggleMetronome' }
  | { type: 'selectRelative'; delta: number }
  | { type: 'selectIndex'; index: number }

/** O que cada botão físico faz. Também usado pela tela de ajuda. */
export const BUTTON_ACTIONS: Readonly<Record<ButtonId, string>> = {
  play: 'Tocar',
  stop: 'Parar (2x volta ao início)',
  record: 'Gravar / parar gravação',
  rewind: 'Desfazer último take da faixa',
  forward: 'Liga/desliga metrônomo',
  up: 'Faixa anterior',
  down: 'Próxima faixa',
  track1: 'Selecionar faixa 1',
  track2: 'Selecionar faixa 2',
  track3: 'Selecionar faixa 3',
  track4: 'Selecionar faixa 4'
}

const TRACK_BUTTONS: Partial<Record<ButtonId, number>> = { track1: 0, track2: 1, track3: 2, track4: 3 }

/** Decide o que um evento do controlador significa no contexto atual do app. */
export function routeEvent(event: ControllerEvent, state: AppState): Command[] {
  const synth = state.activeSynthId
  const drums = state.activeDrumsId
  switch (event.kind) {
    case 'key':
      if (!synth) return []
      return event.on
        ? [{ type: 'noteOn', trackId: synth, note: event.note, velocity: event.velocity }]
        : [{ type: 'noteOff', trackId: synth, note: event.note }]
    case 'pad':
      if (!drums) return []
      return event.on
        ? [{ type: 'noteOn', trackId: drums, note: event.index, velocity: event.velocity }]
        : [{ type: 'noteOff', trackId: drums, note: event.index }]
    case 'padPressure':
      return drums ? [{ type: 'pressure', trackId: drums, value: event.value }] : []
    case 'pitchBend':
      return synth ? [{ type: 'pitchBend', trackId: synth, value: event.value }] : []
    case 'modWheel':
      return synth ? [{ type: 'modWheel', trackId: synth, value: event.value }] : []
    case 'knob':
      return [{ type: 'setParam', trackId: state.selectedTrackId, index: event.index, value: event.value }]
    case 'button':
      return event.pressed ? routeButton(event.button, state) : []
  }
}

function routeButton(button: ButtonId, state: AppState): Command[] {
  const trackIndex = TRACK_BUTTONS[button]
  if (trackIndex !== undefined) return [{ type: 'selectIndex', index: trackIndex }]
  switch (button) {
    case 'play':
      return [{ type: 'play' }]
    case 'stop':
      return [{ type: 'stop' }]
    case 'record':
      return [{ type: 'toggleRecord' }]
    case 'rewind':
      return [{ type: 'undoTake', trackId: state.selectedTrackId }]
    case 'forward':
      return [{ type: 'toggleMetronome' }]
    case 'up':
      return [{ type: 'selectRelative', delta: -1 }]
    case 'down':
      return [{ type: 'selectRelative', delta: 1 }]
    default:
      return []
  }
}
