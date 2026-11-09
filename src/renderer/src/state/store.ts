import { createStore } from 'zustand/vanilla'
import type { TrackKind } from '../audio/params'
import type { NoteEvent, QuantizeGrid } from '../sequencer/types'
import { MAX_TRACKS, createProject, createTrack, newId, type Project, type Track } from './project'

export interface TransportState {
  readonly playing: boolean
  readonly recording: boolean
  readonly metronome: boolean
}

export interface AppState {
  readonly project: Project
  readonly selectedTrackId: string
  /** Faixa que recebe as teclas (último synth selecionado). */
  readonly activeSynthId: string | null
  /** Faixa que recebe os pads (última bateria selecionada). */
  readonly activeDrumsId: string | null
  readonly transport: TransportState
  readonly status: string
}

export interface AppActions {
  selectTrack(id: string): void
  selectTrackByIndex(index: number): void
  selectRelative(delta: number): void
  addTrack(kind: TrackKind): void
  removeTrack(id: string): void
  renameTrack(id: string, name: string): void
  setParam(trackId: string, index: number, value: number): void
  setVolume(trackId: string, volume: number): void
  toggleMute(trackId: string): void
  toggleSolo(trackId: string): void
  setBpm(bpm: number): void
  setLoopBars(bars: number): void
  setQuantize(grid: QuantizeGrid): void
  addTake(trackId: string, events: readonly NoteEvent[]): void
  /** Acrescenta uma nota ao take em andamento, criando o take se ainda não existir. */
  recordEvent(trackId: string, takeId: string, event: NoteEvent): void
  undoTake(trackId: string): void
  clearTrack(trackId: string): void
  setPlaying(playing: boolean): void
  setRecording(recording: boolean): void
  toggleMetronome(): void
  loadProject(project: Project): void
  newProject(): void
  setStatus(status: string): void
}

export type AppStore = AppState & AppActions

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

const firstOfKind = (tracks: readonly Track[], kind: TrackKind): string | null =>
  tracks.find((t) => t.kind === kind)?.id ?? null

function initialState(project: Project): AppState {
  return {
    project,
    selectedTrackId: project.tracks[0].id,
    activeSynthId: firstOfKind(project.tracks, 'synth'),
    activeDrumsId: firstOfKind(project.tracks, 'drums'),
    transport: { playing: false, recording: false, metronome: true },
    status: 'Pronto'
  }
}

function withSelection(state: AppState, id: string): Partial<AppState> {
  const track = state.project.tracks.find((t) => t.id === id)
  if (!track) return {}
  return {
    selectedTrackId: id,
    ...(track.kind === 'synth' ? { activeSynthId: id } : { activeDrumsId: id })
  }
}

export function createAppStore(project: Project = createProject()) {
  return createStore<AppStore>()((set, get) => {
    const updateProject = (fn: (p: Project) => Project) => set((s) => ({ project: fn(s.project) }))
    const updateTrack = (id: string, fn: (t: Track) => Track) =>
      updateProject((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === id ? fn(t) : t)) }))

    return {
      ...initialState(project),

      selectTrack: (id) => set((s) => withSelection(s, id)),
      selectTrackByIndex: (index) => {
        const track = get().project.tracks[index]
        if (track) get().selectTrack(track.id)
      },
      selectRelative: (delta) => {
        const { tracks } = get().project
        const current = tracks.findIndex((t) => t.id === get().selectedTrackId)
        get().selectTrackByIndex(clamp(current + delta, 0, tracks.length - 1))
      },

      addTrack: (kind) => {
        const { tracks } = get().project
        if (tracks.length >= MAX_TRACKS) return get().setStatus(`Limite de ${MAX_TRACKS} faixas`)
        const track = createTrack(kind, tracks.length)
        updateProject((p) => ({ ...p, tracks: [...p.tracks, track] }))
        get().selectTrack(track.id)
      },
      removeTrack: (id) => {
        const { tracks } = get().project
        if (tracks.length <= 1) return get().setStatus('O projeto precisa de pelo menos uma faixa')
        const remaining = tracks.filter((t) => t.id !== id)
        set((s) => {
          const project = { ...s.project, tracks: remaining }
          const pick = (current: string | null, kind: TrackKind) =>
            current && current !== id ? current : firstOfKind(remaining, kind)
          return {
            project,
            selectedTrackId: s.selectedTrackId === id ? remaining[0].id : s.selectedTrackId,
            activeSynthId: pick(s.activeSynthId, 'synth'),
            activeDrumsId: pick(s.activeDrumsId, 'drums')
          }
        })
      },
      renameTrack: (id, name) => {
        const trimmed = name.trim().slice(0, 60)
        if (trimmed) updateTrack(id, (t) => ({ ...t, name: trimmed }))
      },

      setParam: (trackId, index, value) =>
        updateTrack(trackId, (t) => ({ ...t, params: t.params.map((v, i) => (i === index ? clamp(value, 0, 1) : v)) })),
      setVolume: (trackId, volume) => updateTrack(trackId, (t) => ({ ...t, volume: clamp(volume, 0, 1) })),
      toggleMute: (trackId) => updateTrack(trackId, (t) => ({ ...t, muted: !t.muted })),
      toggleSolo: (trackId) => updateTrack(trackId, (t) => ({ ...t, solo: !t.solo })),

      setBpm: (bpm) => updateProject((p) => ({ ...p, bpm: clamp(Math.round(bpm), 40, 240) })),
      setLoopBars: (bars) => updateProject((p) => ({ ...p, loopBars: clamp(Math.round(bars), 1, 16) })),
      setQuantize: (quantize) => updateProject((p) => ({ ...p, quantize })),

      addTake: (trackId, events) => {
        if (events.length === 0) return
        updateTrack(trackId, (t) => ({ ...t, takes: [...t.takes, { id: newId('take'), events: [...events] }] }))
      },
      recordEvent: (trackId, takeId, event) =>
        updateTrack(trackId, (t) => {
          const exists = t.takes.some((take) => take.id === takeId)
          const takes = exists
            ? t.takes.map((take) => (take.id === takeId ? { ...take, events: [...take.events, event] } : take))
            : [...t.takes, { id: takeId, events: [event] }]
          return { ...t, takes }
        }),
      undoTake: (trackId) => updateTrack(trackId, (t) => ({ ...t, takes: t.takes.slice(0, -1) })),
      clearTrack: (trackId) => updateTrack(trackId, (t) => ({ ...t, takes: [] })),

      setPlaying: (playing) =>
        set((s) => ({ transport: { ...s.transport, playing, recording: playing && s.transport.recording } })),
      setRecording: (recording) => set((s) => ({ transport: { ...s.transport, recording } })),
      toggleMetronome: () => set((s) => ({ transport: { ...s.transport, metronome: !s.transport.metronome } })),

      loadProject: (loaded) => set({ ...initialState(loaded) }),
      newProject: () => set({ ...initialState(createProject()) }),
      setStatus: (status) => set({ status })
    }
  })
}

export type AppStoreApi = ReturnType<typeof createAppStore>

export const selectedTrack = (s: AppState): Track | undefined =>
  s.project.tracks.find((t) => t.id === s.selectedTrackId)
