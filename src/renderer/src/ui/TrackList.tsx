import { useActions, useApp } from './context'
import { TrackCard } from './TrackCard'

export function TrackList() {
  const tracks = useApp((s) => s.project.tracks)
  const { addTrack } = useActions()

  return (
    <aside className="track-list">
      <div className="panel-title">Faixas <span className="hint">▲▼ no teclado navegam</span></div>
      <div className="track-scroll">
        {tracks.map((track, i) => <TrackCard key={track.id} track={track} index={i} />)}
      </div>
      <div className="add-track">
        <button onClick={() => addTrack('synth')}>+ Synth</button>
        <button onClick={() => addTrack('drums')}>+ Bateria</button>
      </div>
    </aside>
  )
}
