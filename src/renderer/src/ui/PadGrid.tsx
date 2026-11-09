import { DRUM_PAD_NAMES } from '../audio/params'
import { useApp, useLive, useRuntime } from './context'

const CLICK_VELOCITY = 0.8

export function PadGrid() {
  const runtime = useRuntime()
  const pads = useLive((s) => s.pads)
  const pressure = useLive((s) => s.padPressure)
  const target = useApp((s) => s.project.tracks.find((t) => t.id === s.activeDrumsId))

  const hit = (index: number, on: boolean) =>
    runtime?.dispatch({ kind: 'pad', index, velocity: on ? CLICK_VELOCITY : 0, on })

  return (
    <div className="pad-section">
      <div className="mirror-caption">
        Pads tocam <strong style={{ color: target?.color }}>{target?.name ?? 'nenhuma bateria'}</strong>
      </div>
      <div className="pads">
        {DRUM_PAD_NAMES.map((name, i) => (
          <button
            key={name}
            className={`pad ${pads.has(i) ? 'hit' : ''}`}
            style={{ ['--track-color' as string]: target?.color ?? '#555' }}
            onPointerDown={() => hit(i, true)}
            onPointerUp={() => hit(i, false)}
            onPointerLeave={() => pads.has(i) && hit(i, false)}
          >
            <span className="pad-number">{i + 1}</span>
            <span className="pad-name">{name}</span>
          </button>
        ))}
      </div>
      <div className="pressure" title="Aperte um pad com força: o som abafa (filtro). Isso é o aftertouch dos pads.">
        <span>Pressão</span>
        <div className="meter"><div className="meter-fill" style={{ width: `${pressure * 100}%` }} /></div>
        <span className="hint">abafa o som</span>
      </div>
    </div>
  )
}
