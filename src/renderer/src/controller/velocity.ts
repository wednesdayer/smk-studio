import { PAD_VELOCITY_RANGE } from './smk25Profile'

const PAD_FLOOR = 0.06
const PAD_CURVE = 0.8

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Converte um valor MIDI de 7 bits em 0..1, tratando `min` como zero físico. */
export function normalize7bit(value: number, min = 0): number {
  return clamp01((value - min) / (127 - min))
}

/**
 * Os pads do SMK25 só entregam velocity entre ~30 e ~75 mesmo batendo forte.
 * Esticamos essa faixa para 0..1 com uma curva leve, sem deixar batida fraca muda.
 */
export function rescalePadVelocity(raw: number): number {
  const { min, max } = PAD_VELOCITY_RANGE
  const x = clamp01((raw - min) / (max - min))
  return PAD_FLOOR + (1 - PAD_FLOOR) * Math.pow(x, PAD_CURVE)
}
