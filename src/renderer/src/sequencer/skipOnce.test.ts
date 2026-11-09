import { describe, expect, it } from 'vitest'
import { SkipOnce } from './skipOnce'
import { loopTicksFor } from './types'

const LOOP = loopTicksFor(1)
const ev = (tick: number) => ({ tick, note: 0, velocity: 1, duration: 10 })

describe('SkipOnce', () => {
  it('pula uma única vez a nota quantizada para frente do cursor', () => {
    const skip = new SkipOnce()
    const e = ev(96)
    skip.markIfAhead(e, 80, LOOP)
    expect(skip.consume(e)).toBe(true)
    expect(skip.consume(e)).toBe(false)
  })

  it('não marca nota que já ficou para trás', () => {
    const skip = new SkipOnce()
    const e = ev(48)
    skip.markIfAhead(e, 80, LOOP)
    expect(skip.consume(e)).toBe(false)
  })

  it('considera a virada do loop', () => {
    const skip = new SkipOnce()
    const e = ev(0)
    skip.markIfAhead(e, LOOP - 10, LOOP)
    expect(skip.consume(e)).toBe(true)
  })
})
