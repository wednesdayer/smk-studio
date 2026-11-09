import type { ButtonId } from './smk25Profile'

/** Eventos do controlador já traduzidos. Valores contínuos vêm normalizados (0..1 ou -1..1). */
export type ControllerEvent =
  | { kind: 'key'; note: number; velocity: number; on: boolean }
  | { kind: 'pad'; index: number; velocity: number; on: boolean }
  | { kind: 'padPressure'; value: number }
  | { kind: 'pitchBend'; value: number }
  | { kind: 'modWheel'; value: number }
  | { kind: 'knob'; index: number; value: number }
  | { kind: 'button'; button: ButtonId; pressed: boolean }
