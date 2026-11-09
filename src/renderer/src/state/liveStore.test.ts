import { describe, expect, it } from 'vitest'
import { initialLiveState, reduceLive } from './liveStore'

describe('reduceLive', () => {
  it('marca e desmarca teclas sem mutar o estado anterior', () => {
    const pressed = reduceLive(initialLiveState, { kind: 'key', note: 60, velocity: 1, on: true }, 0)
    expect(pressed.keys.has(60)).toBe(true)
    expect(initialLiveState.keys.has(60)).toBe(false)
    const released = reduceLive(pressed, { kind: 'key', note: 60, velocity: 0, on: false }, 0)
    expect(released.keys.has(60)).toBe(false)
  })

  it('soltar pad zera a pressão', () => {
    let s = reduceLive(initialLiveState, { kind: 'pad', index: 2, velocity: 1, on: true }, 0)
    s = reduceLive(s, { kind: 'padPressure', value: 0.8 }, 0)
    expect(s.padPressure).toBe(0.8)
    s = reduceLive(s, { kind: 'pad', index: 2, velocity: 0, on: false }, 0)
    expect(s.padPressure).toBe(0)
    expect(s.pads.size).toBe(0)
  })

  it('registra pitch, modulação e último knob tocado', () => {
    let s = reduceLive(initialLiveState, { kind: 'pitchBend', value: -0.5 }, 0)
    s = reduceLive(s, { kind: 'modWheel', value: 0.3 }, 0)
    s = reduceLive(s, { kind: 'knob', index: 4, value: 0.1 }, 123)
    expect(s).toMatchObject({ pitchBend: -0.5, modWheel: 0.3, touchedKnob: { index: 4, at: 123 } })
  })

  it('botões não mudam o estado visual', () => {
    const s = reduceLive(initialLiveState, { kind: 'button', button: 'play', pressed: true }, 0)
    expect(s).toBe(initialLiveState)
  })
})
