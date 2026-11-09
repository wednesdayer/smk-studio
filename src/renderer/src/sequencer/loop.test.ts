import { describe, expect, it } from 'vitest'
import {
  beginNote,
  emptySession,
  endNote,
  eventsInWindow,
  finishSession,
  flattenTakes,
  quantizeTick,
  removeLastTake,
  wrapTick
} from './loop'
import { PPQ, loopTicksFor, type Take } from './types'

const LOOP = loopTicksFor(1) // 768 ticks

describe('wrapTick', () => {
  it('mantém dentro do loop, inclusive valores negativos', () => {
    expect(wrapTick(800, LOOP)).toBe(32)
    expect(wrapTick(-10, LOOP)).toBe(LOOP - 10)
    expect(wrapTick(0, LOOP)).toBe(0)
  })
})

describe('quantizeTick', () => {
  it('arredonda para a grade mais próxima', () => {
    expect(quantizeTick(50, '1/16', LOOP)).toBe(48)
    expect(quantizeTick(70, '1/16', LOOP)).toBe(48)
    expect(quantizeTick(80, '1/16', LOOP)).toBe(96)
  })

  it('nota tocada logo antes do fim do loop vai para o tempo 1', () => {
    expect(quantizeTick(LOOP - 5, '1/16', LOOP)).toBe(0)
  })

  it('sem quantização mantém o tick', () => {
    expect(quantizeTick(53, 'off', LOOP)).toBe(53)
  })
})

describe('sessão de gravação', () => {
  it('grava nota com duração', () => {
    let s = emptySession()
    s = beginNote(s, 60, 0.8, 100)
    s = endNote(s, 60, 300, LOOP)
    expect(s.events).toEqual([{ tick: 100, note: 60, velocity: 0.8, duration: 200 }])
    expect(s.pending).toEqual({})
  })

  it('nota que atravessa o fim do loop tem duração correta', () => {
    let s = beginNote(emptySession(), 60, 1, LOOP - 50)
    s = endNote(s, 60, 50, LOOP)
    expect(s.events[0].duration).toBe(100)
  })

  it('duração zero vira duração mínima', () => {
    let s = beginNote(emptySession(), 60, 1, 10)
    s = endNote(s, 60, 10, LOOP)
    expect(s.events[0].duration).toBeGreaterThan(0)
  })

  it('ignora note off sem note on', () => {
    const s = endNote(emptySession(), 60, 10, LOOP)
    expect(s.events).toEqual([])
  })

  it('não altera a sessão original (imutável)', () => {
    const original = emptySession()
    beginNote(original, 60, 1, 0)
    expect(original.pending).toEqual({})
  })

  it('finishSession fecha notas ainda presas', () => {
    let s = beginNote(emptySession(), 60, 1, 0)
    s = beginNote(s, 64, 1, 10)
    const events = finishSession(s, 110, LOOP)
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.duration)).toEqual([110, 100])
  })
})

describe('takes', () => {
  const takes: Take[] = [
    { id: 'a', events: [{ tick: 300, note: 1, velocity: 1, duration: 10 }] },
    { id: 'b', events: [{ tick: 100, note: 2, velocity: 1, duration: 10 }] }
  ]

  it('flattenTakes junta e ordena por tick', () => {
    expect(flattenTakes(takes).map((e) => e.tick)).toEqual([100, 300])
  })

  it('removeLastTake desfaz o último take sem mutar', () => {
    const result = removeLastTake(takes)
    expect(result.map((t) => t.id)).toEqual(['a'])
    expect(takes).toHaveLength(2)
  })

  it('removeLastTake em lista vazia retorna vazia', () => {
    expect(removeLastTake([])).toEqual([])
  })
})

describe('eventsInWindow', () => {
  const events = [
    { tick: 0, note: 0, velocity: 1, duration: 10 },
    { tick: PPQ, note: 1, velocity: 1, duration: 10 },
    { tick: LOOP - 10, note: 2, velocity: 1, duration: 10 }
  ]

  it('retorna eventos dentro da janela com deslocamento em ticks', () => {
    const found = eventsInWindow(events, PPQ - 20, PPQ + 20, LOOP)
    expect(found).toEqual([{ event: events[1], offsetTicks: 20 }])
  })

  it('janela que atravessa o fim do loop pega o começo do próximo', () => {
    const found = eventsInWindow(events, LOOP - 20, LOOP + 20, LOOP)
    expect(found.map((f) => [f.event.note, f.offsetTicks])).toEqual([
      [2, 10],
      [0, 20]
    ])
  })

  it('início é inclusivo e fim é exclusivo', () => {
    expect(eventsInWindow(events, 0, PPQ, LOOP).map((f) => f.event.note)).toEqual([0])
  })
})
