import { describe, expect, it } from 'vitest'
import { DRUM_PARAMS, SYNTH_PARAMS, defaultParamValues, describeParam, paramsFor } from './params'

describe('params', () => {
  it('cada tipo de faixa tem exatamente 8 parâmetros, um por knob', () => {
    expect(SYNTH_PARAMS).toHaveLength(8)
    expect(DRUM_PARAMS).toHaveLength(8)
  })

  it('valores padrão ficam entre 0 e 1', () => {
    for (const kind of ['synth', 'drums'] as const) {
      defaultParamValues(kind).forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    }
  })

  it('forma de onda é discreta e cobre as 4 opções', () => {
    const wave = paramsFor('synth')[0]
    expect([0, 0.3, 0.6, 1].map(wave.toValue)).toEqual([0, 1, 2, 3])
  })

  it('filtro é exponencial entre 80 Hz e 12 kHz', () => {
    const filter = SYNTH_PARAMS[1]
    expect(filter.toValue(0)).toBeCloseTo(80)
    expect(filter.toValue(1)).toBeCloseTo(12000)
    expect(describeParam('synth', 1, 1)).toBe('12.0 kHz')
    expect(describeParam('synth', 1, 0)).toBe('80 Hz')
  })

  it('formata tempos, porcentagens e semitons', () => {
    expect(describeParam('synth', 3, 1)).toBe('2.00 s')
    expect(describeParam('synth', 3, 0)).toBe('2 ms')
    expect(describeParam('synth', 7, 0.5)).toBe('50%')
    expect(describeParam('drums', 0, 1)).toBe('+12 st')
    expect(describeParam('drums', 0, 0)).toBe('-12 st')
    expect(describeParam('synth', 0, 0)).toBe('Senoide')
  })

  it('índice inválido retorna texto vazio', () => {
    expect(describeParam('synth', 99, 0.5)).toBe('')
  })
})
