import { describe, expect, it } from 'vitest'
import { createProject, createTrack, parseProject, serializeProject } from './project'

describe('project', () => {
  it('projeto novo vem com uma bateria e um synth', () => {
    const p = createProject()
    expect(p.tracks.map((t) => t.kind)).toEqual(['drums', 'synth'])
  })

  it('ida e volta pelo disco preserva o projeto', () => {
    const p = createProject()
    const result = parseProject(serializeProject(p))
    expect(result).toEqual({ ok: true, project: p })
  })

  it('rejeita JSON quebrado com mensagem clara', () => {
    expect(parseProject('{nope')).toEqual({ ok: false, error: 'O arquivo não é um JSON válido.' })
  })

  it('rejeita projeto com campo inválido e aponta onde', () => {
    const bad = { ...createProject(), bpm: 999 }
    const result = parseProject(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('bpm')
  })

  it('rejeita faixa com número errado de parâmetros', () => {
    const track = { ...createTrack('synth', 0), params: [0.5] }
    const result = parseProject(JSON.stringify({ ...createProject(), tracks: [track] }))
    expect(result.ok).toBe(false)
  })

  it('ids de faixa são únicos', () => {
    const ids = new Set(Array.from({ length: 50 }, (_, i) => createTrack('synth', i).id))
    expect(ids.size).toBe(50)
  })
})
