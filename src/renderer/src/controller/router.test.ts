import { describe, expect, it } from 'vitest'
import { createProject } from '../state/project'
import { createAppStore } from '../state/store'
import { BUTTON_ACTIONS, routeEvent } from './router'
import { TRANSPORT_BUTTONS } from './smk25Profile'

const store = createAppStore(createProject())
const state = store.getState()
const [drumsId, synthId] = state.project.tracks.map((t) => t.id)

describe('routeEvent', () => {
  it('teclas tocam o synth ativo mesmo com a bateria selecionada', () => {
    expect(routeEvent({ kind: 'key', note: 60, velocity: 0.5, on: true }, state)).toEqual([
      { type: 'noteOn', trackId: synthId, note: 60, velocity: 0.5 }
    ])
    expect(routeEvent({ kind: 'key', note: 60, velocity: 0, on: false }, state)).toEqual([
      { type: 'noteOff', trackId: synthId, note: 60 }
    ])
  })

  it('pads tocam a bateria ativa', () => {
    expect(routeEvent({ kind: 'pad', index: 3, velocity: 1, on: true }, state)).toEqual([
      { type: 'noteOn', trackId: drumsId, note: 3, velocity: 1 }
    ])
    expect(routeEvent({ kind: 'pad', index: 3, velocity: 0, on: false }, state)).toEqual([
      { type: 'noteOff', trackId: drumsId, note: 3 }
    ])
  })

  it('pressão vai para a bateria; pitch e modulação para o synth', () => {
    expect(routeEvent({ kind: 'padPressure', value: 0.4 }, state)[0]).toMatchObject({ type: 'pressure', trackId: drumsId })
    expect(routeEvent({ kind: 'pitchBend', value: -1 }, state)[0]).toMatchObject({ type: 'pitchBend', trackId: synthId })
    expect(routeEvent({ kind: 'modWheel', value: 1 }, state)[0]).toMatchObject({ type: 'modWheel', trackId: synthId })
  })

  it('knobs controlam a faixa selecionada', () => {
    expect(routeEvent({ kind: 'knob', index: 1, value: 0.3 }, state)).toEqual([
      { type: 'setParam', trackId: drumsId, index: 1, value: 0.3 }
    ])
  })

  it('sem faixa do tipo certo, nada acontece', () => {
    const empty = { ...state, activeSynthId: null, activeDrumsId: null }
    expect(routeEvent({ kind: 'key', note: 60, velocity: 1, on: true }, empty)).toEqual([])
    expect(routeEvent({ kind: 'pad', index: 0, velocity: 1, on: true }, empty)).toEqual([])
    expect(routeEvent({ kind: 'padPressure', value: 1 }, empty)).toEqual([])
    expect(routeEvent({ kind: 'pitchBend', value: 1 }, empty)).toEqual([])
    expect(routeEvent({ kind: 'modWheel', value: 1 }, empty)).toEqual([])
  })

  it.each([
    ['play', { type: 'play' }],
    ['stop', { type: 'stop' }],
    ['record', { type: 'toggleRecord' }],
    ['forward', { type: 'toggleMetronome' }],
    ['up', { type: 'selectRelative', delta: -1 }],
    ['down', { type: 'selectRelative', delta: 1 }],
    ['track1', { type: 'selectIndex', index: 0 }],
    ['track4', { type: 'selectIndex', index: 3 }]
  ] as const)('botão %s', (button, command) => {
    expect(routeEvent({ kind: 'button', button, pressed: true }, state)).toEqual([command])
  })

  it('rewind desfaz o take da faixa selecionada', () => {
    expect(routeEvent({ kind: 'button', button: 'rewind', pressed: true }, state)).toEqual([
      { type: 'undoTake', trackId: drumsId }
    ])
  })

  it('soltar botão não faz nada', () => {
    expect(routeEvent({ kind: 'button', button: 'play', pressed: false }, state)).toEqual([])
  })

  it('todo botão do perfil tem descrição de ajuda', () => {
    Object.values(TRANSPORT_BUTTONS).forEach((b) => expect(BUTTON_ACTIONS[b]).toBeTruthy())
  })
})
