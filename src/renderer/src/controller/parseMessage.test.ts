import { describe, expect, it } from 'vitest'
import { parseMessage } from './parseMessage'
import { detectPortRole } from './smk25Profile'

describe('detectPortRole', () => {
  it.each([
    ['SMK25', 'main'],
    ['SMK25 2', 'main'],
    ['MIDIIN2 (SMK25)', 'duplicate'],
    ['MIDIIN3 (SMK25)', 'transport'],
    ['SMK25V2-bt', 'bluetooth'],
    ['SMK25V2-bt-DAW', 'unknown'],
    ['Microsoft GS Wavetable Synth', 'unknown']
  ])('%s -> %s', (name, role) => {
    expect(detectPortRole(name)).toBe(role)
  })
})

describe('parseMessage - porta principal', () => {
  it('converte note on das teclas com velocity normalizada', () => {
    expect(parseMessage('main', [0x90, 60, 127])).toEqual({ kind: 'key', note: 60, velocity: 1, on: true })
  })

  it('trata note on com velocity 0 como note off', () => {
    expect(parseMessage('main', [0x90, 60, 0])).toEqual({ kind: 'key', note: 60, velocity: 0, on: false })
  })

  it('converte note off', () => {
    expect(parseMessage('main', [0x80, 60, 64])).toMatchObject({ kind: 'key', note: 60, on: false })
  })

  it('reconhece pads no canal 10 e re-escala a velocity', () => {
    expect(parseMessage('main', [0x99, 38, 75])).toEqual({ kind: 'pad', index: 2, velocity: 1, on: true })
  })

  it('pad batido leve ainda soa, mas baixo', () => {
    const event = parseMessage('main', [0x99, 36, 40])
    expect(event?.kind).toBe('pad')
    if (event?.kind === 'pad') {
      expect(event.velocity).toBeGreaterThan(0)
      expect(event.velocity).toBeLessThan(0.5)
    }
  })

  it('pad solto vira note off', () => {
    expect(parseMessage('main', [0x89, 36, 64])).toEqual({ kind: 'pad', index: 0, velocity: 0, on: false })
  })

  it('ignora notas no canal 10 que não são pads', () => {
    expect(parseMessage('main', [0x99, 60, 100])).toBeNull()
  })

  it('converte aftertouch dos pads', () => {
    expect(parseMessage('main', [0xd9, 127])).toEqual({ kind: 'padPressure', value: 1 })
  })

  it('converte pitch bend em -1..1', () => {
    expect(parseMessage('main', [0xe0, 0, 64])).toEqual({ kind: 'pitchBend', value: 0 })
    expect(parseMessage('main', [0xe0, 0, 0])).toEqual({ kind: 'pitchBend', value: -1 })
    const max = parseMessage('main', [0xe0, 127, 127])
    expect(max?.kind === 'pitchBend' ? max.value : NaN).toBeCloseTo(1, 3)
  })

  it('converte roda de modulação', () => {
    expect(parseMessage('main', [0xb0, 1, 127])).toEqual({ kind: 'modWheel', value: 1 })
  })

  it('converte knobs 1-4 de 0 a 127', () => {
    expect(parseMessage('main', [0xb0, 20, 0])).toEqual({ kind: 'knob', index: 0, value: 0 })
    expect(parseMessage('main', [0xb0, 23, 127])).toEqual({ kind: 'knob', index: 3, value: 1 })
  })

  it('knobs 5-8 chegam a 0 mesmo com mínimo físico 1', () => {
    expect(parseMessage('main', [0xb0, 24, 1])).toEqual({ kind: 'knob', index: 4, value: 0 })
    expect(parseMessage('main', [0xb0, 27, 127])).toEqual({ kind: 'knob', index: 7, value: 1 })
  })

  it('ignora CCs desconhecidos e mensagens curtas ou de sistema', () => {
    expect(parseMessage('main', [0xb0, 99, 10])).toBeNull()
    expect(parseMessage('main', [0x90])).toBeNull()
    expect(parseMessage('main', [])).toBeNull()
    expect(parseMessage('main', [0xf8])).toBeNull()
  })
})

describe('parseMessage - outras portas', () => {
  it('converte botões da porta de transporte', () => {
    expect(parseMessage('transport', [0x90, 94, 127])).toEqual({ kind: 'button', button: 'play', pressed: true })
    expect(parseMessage('transport', [0x90, 94, 0])).toEqual({ kind: 'button', button: 'play', pressed: false })
    expect(parseMessage('transport', [0x90, 2, 127])).toEqual({ kind: 'button', button: 'track3', pressed: true })
  })

  it('ignora notas desconhecidas na porta de transporte', () => {
    expect(parseMessage('transport', [0x90, 50, 127])).toBeNull()
    expect(parseMessage('transport', [0xb0, 1, 127])).toBeNull()
  })

  it('ignora a porta duplicada para não tocar tudo duas vezes', () => {
    expect(parseMessage('duplicate', [0x90, 60, 100])).toBeNull()
  })

  it('aceita a porta bluetooth como principal', () => {
    expect(parseMessage('bluetooth', [0x90, 60, 127])).toMatchObject({ kind: 'key', on: true })
  })

  it('ignora portas desconhecidas', () => {
    expect(parseMessage('unknown', [0x90, 60, 127])).toBeNull()
  })
})
