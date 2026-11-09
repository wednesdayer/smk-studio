/** Resolução do relógio: ticks por semínima (igual ao padrão do Tone.js). */
export const PPQ = 192
export const BEATS_PER_BAR = 4

/** Nota gravada. Em faixas de bateria, `note` é o índice do pad (0..7). */
export interface NoteEvent {
  readonly tick: number
  readonly note: number
  readonly velocity: number
  readonly duration: number
}

/** Uma passada de gravação. Desfazer remove o take inteiro. */
export interface Take {
  readonly id: string
  readonly events: readonly NoteEvent[]
}

export type QuantizeGrid = 'off' | '1/8' | '1/16' | '1/32'

export const GRID_TICKS: Readonly<Record<QuantizeGrid, number>> = {
  off: 1,
  '1/8': PPQ / 2,
  '1/16': PPQ / 4,
  '1/32': PPQ / 8
}

export const loopTicksFor = (bars: number): number => bars * BEATS_PER_BAR * PPQ
