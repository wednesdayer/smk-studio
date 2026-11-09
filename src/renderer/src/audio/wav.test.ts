import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

const text = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)))

describe('encodeWav', () => {
  it('gera cabeçalho WAV válido', () => {
    const buf = encodeWav([new Float32Array(10), new Float32Array(10)], 48000)
    const view = new DataView(buf)
    expect(text(view, 0, 4)).toBe('RIFF')
    expect(text(view, 8, 4)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(24, true)).toBe(48000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(10 * 2 * 2)
    expect(buf.byteLength).toBe(44 + 40)
  })

  it('converte e limita amostras, intercalando canais', () => {
    const left = new Float32Array([1, -1, 2])
    const right = new Float32Array([0, 0.5, -2])
    const view = new DataView(encodeWav([left, right], 44100))
    const samples = Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true))
    expect(samples).toEqual([32767, 0, -32768, 16383, 32767, -32768])
  })

  it('falha com mensagem clara sem canais', () => {
    expect(() => encodeWav([], 44100)).toThrow('Nenhum canal')
  })
})
