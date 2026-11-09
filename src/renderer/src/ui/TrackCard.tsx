import type { Track } from '../state/project'
import { useActions, useApp, useRuntime } from './context'

interface Props {
  readonly track: Track
  readonly index: number
}

export function TrackCard({ track, index }: Props) {
  const runtime = useRuntime()
  const selected = useApp((s) => s.selectedTrackId === track.id)
  const isKeysTarget = useApp((s) => s.activeSynthId === track.id)
  const isPadsTarget = useApp((s) => s.activeDrumsId === track.id)
  const { selectTrack, toggleMute, toggleSolo, setVolume, clearTrack, removeTrack, renameTrack } = useActions()
  const noteCount = track.takes.reduce((n, t) => n + t.events.length, 0)

  return (
    <div
      className={`track-card ${selected ? 'selected' : ''}`}
      style={{ ['--track-color' as string]: track.color }}
      onClick={() => selectTrack(track.id)}
    >
      <div className="track-top">
        <span className="track-index" title={index < 4 ? `Botão de faixa ${index + 1} no teclado` : undefined}>{index + 1}</span>
        <input
          className="track-name"
          defaultValue={track.name}
          onBlur={(e) => renameTrack(track.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="track-kind">{track.kind === 'synth' ? '🎹' : '🥁'}</span>
      </div>

      <div className="track-badges">
        {isKeysTarget && <span className="badge">recebe as teclas</span>}
        {isPadsTarget && <span className="badge">recebe os pads</span>}
        <span className="badge muted-badge">{plural(noteCount, 'nota', 'notas')} · {plural(track.takes.length, 'take', 'takes')}</span>
      </div>

      <div className="track-controls" onClick={(e) => e.stopPropagation()}>
        <button className={`mini ${track.muted ? 'on mute' : ''}`} onClick={() => toggleMute(track.id)} title="Mudo">M</button>
        <button className={`mini ${track.solo ? 'on solo' : ''}`} onClick={() => toggleSolo(track.id)} title="Solo">S</button>
        <input
          type="range" min={0} max={1} step={0.01} value={track.volume}
          onChange={(e) => setVolume(track.id, Number(e.target.value))}
          title={`Volume ${Math.round(track.volume * 100)}%`}
        />
        <button className="mini" onClick={() => runtime?.run([{ type: 'undoTake', trackId: track.id }])} title="Desfazer último take (« no teclado)">↶</button>
        <button className="mini" onClick={() => clearTrack(track.id)} title="Apagar todas as notas">⌫</button>
        <button className="mini" onClick={() => removeTrack(track.id)} title="Remover faixa">✕</button>
      </div>
    </div>
  )
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
