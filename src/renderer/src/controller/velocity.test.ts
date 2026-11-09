import { describe, expect, it } from 'vitest'
import { normalize7bit, rescalePadVelocity } from './velocity'

describe('rescalePadVelocity', () => {
  it('batida mais forte vira 1', () => {
    expect(rescalePadVelocity(75)).toBe(1)
    expect(rescalePadVelocity(127)).toBe(1)
  })

  it('abaixo do mínimo ainda soa baixinho', () => {
    expect(rescalePadVelocity(10)).toBeGreaterThan(0)
    expect(rescalePadVelocity(10)).toBeLessThanOrEqual(0.1)
  })

  it('é monotônica dentro da faixa real', () => {
    const values = [30, 40, 50, 60, 70, 75].map(rescalePadVelocity)
    values.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(values[i]))
  })
})

describe('normalize7bit', () => {
  it('mapeia 0..127 em 0..1 respeitando o mínimo físico', () => {
    expect(normalize7bit(0)).toBe(0)
    expect(normalize7bit(127)).toBe(1)
    expect(normalize7bit(1, 1)).toBe(0)
    expect(normalize7bit(0, 1)).toBe(0)
  })
})
