const BYTES_PER_SAMPLE = 2
const HEADER_SIZE = 44

/** Codifica canais PCM float (-1..1) em um arquivo WAV 16-bit. */
export function encodeWav(channels: readonly Float32Array[], sampleRate: number): ArrayBuffer {
  if (channels.length === 0) throw new Error('Nenhum canal de áudio para exportar')
  const frames = channels[0].length
  const channelCount = channels.length
  const dataSize = frames * channelCount * BYTES_PER_SAMPLE
  const buffer = new ArrayBuffer(HEADER_SIZE + dataSize)
  const view = new DataView(buffer)

  writeHeader(view, { channelCount, sampleRate, dataSize })

  let offset = HEADER_SIZE
  for (let frame = 0; frame < frames; frame++) {
    for (let ch = 0; ch < channelCount; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][frame] ?? 0))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += BYTES_PER_SAMPLE
    }
  }
  return buffer
}

function writeHeader(view: DataView, h: { channelCount: number; sampleRate: number; dataSize: number }): void {
  const writeText = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  const blockAlign = h.channelCount * BYTES_PER_SAMPLE

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + h.dataSize, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, h.channelCount, true)
  view.setUint32(24, h.sampleRate, true)
  view.setUint32(28, h.sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true)
  writeText(36, 'data')
  view.setUint32(40, h.dataSize, true)
}
