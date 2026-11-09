/**
 * O que cada um dos 8 knobs faz em cada tipo de faixa.
 * Os knobs mandam 0..1; aqui convertemos para a unidade real e um texto legível.
 */

export type TrackKind = 'synth' | 'drums'

export interface ParamDef {
  readonly label: string
  readonly defaultValue: number
  /** Converte 0..1 do knob para o valor usado pelo motor de áudio. */
  readonly toValue: (normalized: number) => number
  readonly format: (value: number) => string
}

export const WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square'] as const
export type Waveform = (typeof WAVEFORMS)[number]
const WAVEFORM_LABELS = ['Senoide', 'Triângulo', 'Dente de serra', 'Quadrada'] as const

const linear = (min: number, max: number) => (n: number) => min + (max - min) * n
const exponential = (min: number, max: number) => (n: number) => min * Math.pow(max / min, n)
const stepped = (count: number) => (n: number) => Math.min(count - 1, Math.floor(n * count))

const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`)
const seconds = (v: number) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`)
const percent = (v: number) => `${Math.round(v * 100)}%`
const semitones = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)} st`

export const SYNTH_PARAMS: readonly ParamDef[] = [
  { label: 'Onda', defaultValue: 0.6, toValue: stepped(WAVEFORMS.length), format: (v) => WAVEFORM_LABELS[v] },
  { label: 'Filtro', defaultValue: 0.7, toValue: exponential(80, 12000), format: hz },
  { label: 'Ressonância', defaultValue: 0.1, toValue: linear(0.5, 15), format: (v) => v.toFixed(1) },
  { label: 'Ataque', defaultValue: 0.05, toValue: exponential(0.002, 2), format: seconds },
  { label: 'Decay', defaultValue: 0.3, toValue: exponential(0.01, 2), format: seconds },
  { label: 'Sustain', defaultValue: 0.6, toValue: linear(0, 1), format: percent },
  { label: 'Release', defaultValue: 0.3, toValue: exponential(0.01, 4), format: seconds },
  { label: 'Reverb', defaultValue: 0.2, toValue: linear(0, 1), format: percent }
]

export const DRUM_PARAMS: readonly ParamDef[] = [
  { label: 'Afinação', defaultValue: 0.5, toValue: linear(-12, 12), format: semitones },
  { label: 'Duração', defaultValue: 0.5, toValue: exponential(0.3, 3), format: (v) => `${v.toFixed(1)}x` },
  { label: 'Brilho', defaultValue: 0.85, toValue: exponential(200, 18000), format: hz },
  { label: 'Saturação', defaultValue: 0, toValue: linear(0, 0.8), format: percent },
  { label: 'Bumbo', defaultValue: 0.8, toValue: linear(0, 1), format: percent },
  { label: 'Caixa', defaultValue: 0.8, toValue: linear(0, 1), format: percent },
  { label: 'Pratos', defaultValue: 0.7, toValue: linear(0, 1), format: percent },
  { label: 'Reverb', defaultValue: 0.1, toValue: linear(0, 1), format: percent }
]

export const paramsFor = (kind: TrackKind): readonly ParamDef[] => (kind === 'synth' ? SYNTH_PARAMS : DRUM_PARAMS)

export const defaultParamValues = (kind: TrackKind): number[] => paramsFor(kind).map((p) => p.defaultValue)

export function describeParam(kind: TrackKind, index: number, normalized: number): string {
  const def = paramsFor(kind)[index]
  return def ? def.format(def.toValue(normalized)) : ''
}

export const DRUM_PAD_NAMES = ['Bumbo', 'Caixa', 'Chimbal', 'Chimbal aberto', 'Palma', 'Tom grave', 'Tom agudo', 'Aro'] as const
