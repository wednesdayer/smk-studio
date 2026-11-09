import { useMemo } from 'react'
import { DRUM_PAD_NAMES } from '../audio/params'
import { flattenTakes } from '../sequencer/loop'
import { BEATS_PER_BAR, PPQ, loopTicksFor, type NoteEvent } from '../sequencer/types'
import { selectedTrack } from '../state/store'
import { useApp } from './context'
import { usePlayhead } from './usePlayhead'

const WIDTH = 1000
const DRUM_ROWS = DRUM_PAD_NAMES.length

function rowsFor(kind: 'synth' | 'drums', events: readonly NoteEvent[]): { low: number; high: number } {
  if (kind === 'drums') return { low: 0, high: DRUM_ROWS - 1 }
  if (events.length === 0) return { low: 48, high: 72 }
  const low = events.reduce((m, e) => Math.min(m, e.note), Infinity)
  const high = events.reduce((m, e) => Math.max(m, e.note), -Infinity)
  return { low: low - 2, high: high + 2 }
}

export function LoopView() {
  const track = useApp(selectedTrack)
  const loopBars = useApp((s) => s.project.loopBars)
  const takes = track?.takes
  const events = useMemo(() => (takes ? flattenTakes(takes) : []), [takes])
  if (!track) return null

  const loopTicks = loopTicksFor(loopBars)
  const { low, high } = rowsFor(track.kind, events)
  const rows = high - low + 1
  const height = track.kind === 'drums' ? 240 : Math.max(200, Math.min(320, rows * 10))
  const rowH = height / rows
  const x = (tick: number) => (tick / loopTicks) * WIDTH
  const y = (note: number) => (high - note) * rowH
  const beats = loopBars * BEATS_PER_BAR

  return (
    <section className="loop-view">
      <div className="panel-title">
        Loop de <strong style={{ color: track.color }}>{track.name}</strong>
        <span className="hint">
          {events.length === 0 ? 'Aperte ● no teclado e toque, a gravação entra no loop' : `${events.length} notas`}
        </span>
      </div>
      <div className="loop-canvas">
        {track.kind === 'drums' && (
          <div className="row-labels" style={{ height }}>
            {[...DRUM_PAD_NAMES].reverse().map((n) => <span key={n} style={{ height: rowH }}>{n}</span>)}
          </div>
        )}
        <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" style={{ height }}>
          {Array.from({ length: beats }, (_, i) => (
            <line key={i} x1={x(i * PPQ)} x2={x(i * PPQ)} y1={0} y2={height} className={i % BEATS_PER_BAR === 0 ? 'grid-bar' : 'grid-beat'} />
          ))}
          {events.map((e, i) => (
            <rect
              key={i}
              x={x(e.tick)}
              y={y(e.note) + 1}
              width={Math.max(4, x(track.kind === 'drums' ? PPQ / 8 : e.duration))}
              height={Math.max(2, rowH - 2)}
              rx={2}
              fill={track.color}
              opacity={0.35 + e.velocity * 0.65}
            />
          ))}
          <Playhead height={height} />
        </svg>
      </div>
    </section>
  )
}

/** Só o cursor re-renderiza a cada frame; as notas ficam paradas. */
function Playhead({ height }: { height: number }) {
  const recording = useApp((s) => s.transport.recording)
  const { progress } = usePlayhead()
  const x = progress * WIDTH
  return <line className={`playhead ${recording ? 'rec' : ''}`} x1={x} x2={x} y1={0} y2={height} />
}
