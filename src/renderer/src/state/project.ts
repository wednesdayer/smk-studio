import { z } from 'zod'
import { defaultParamValues, type TrackKind } from '../audio/params'
import type { QuantizeGrid, Take } from '../sequencer/types'

export const PROJECT_VERSION = 1
export const MAX_TRACKS = 16
export const TRACK_COLORS = ['#ff8a3d', '#4cc9f0', '#b388ff', '#7bd88f', '#ff5c8a', '#ffd166', '#2ec4b6', '#f4a261'] as const

export interface Track {
  readonly id: string
  readonly name: string
  readonly kind: TrackKind
  readonly color: string
  readonly volume: number
  readonly muted: boolean
  readonly solo: boolean
  readonly params: readonly number[]
  readonly takes: readonly Take[]
}

export interface Project {
  readonly version: number
  readonly name: string
  readonly bpm: number
  readonly loopBars: number
  readonly quantize: QuantizeGrid
  readonly tracks: readonly Track[]
}

const unit = z.number().min(0).max(1)

const noteEventSchema = z.object({
  tick: z.number().int().min(0),
  note: z.number().int().min(0).max(127),
  velocity: unit,
  duration: z.number().positive()
})

const trackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  kind: z.enum(['synth', 'drums']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  volume: unit,
  muted: z.boolean(),
  solo: z.boolean(),
  params: z.array(unit).length(8),
  takes: z.array(z.object({ id: z.string(), events: z.array(noteEventSchema) }))
})

export const projectSchema = z.object({
  version: z.literal(PROJECT_VERSION),
  name: z.string().min(1).max(100),
  bpm: z.number().min(40).max(240),
  loopBars: z.number().int().min(1).max(16),
  quantize: z.enum(['off', '1/8', '1/16', '1/32']),
  tracks: z.array(trackSchema).min(1).max(MAX_TRACKS)
})

let idCounter = 0
export const newId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export function createTrack(kind: TrackKind, index: number): Track {
  return {
    id: newId('track'),
    name: kind === 'synth' ? `Synth ${index + 1}` : `Bateria ${index + 1}`,
    kind,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
    volume: 0.8,
    muted: false,
    solo: false,
    params: defaultParamValues(kind),
    takes: []
  }
}

export function createProject(): Project {
  return {
    version: PROJECT_VERSION,
    name: 'Novo projeto',
    bpm: 100,
    loopBars: 2,
    quantize: '1/16',
    tracks: [createTrack('drums', 0), createTrack('synth', 1)]
  }
}

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string }

/** Valida um projeto vindo de arquivo. Nunca confie no conteúdo do disco. */
export function parseProject(json: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' }
  }
  const result = projectSchema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    return { ok: false, error: `Projeto inválido em "${issue.path.join('.')}": ${issue.message}` }
  }
  return { ok: true, project: result.data }
}

export const serializeProject = (project: Project): string => JSON.stringify(project, null, 2)
