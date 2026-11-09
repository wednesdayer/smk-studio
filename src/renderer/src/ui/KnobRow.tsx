import { useEffect, useState } from 'react'
import { describeParam, paramsFor } from '../audio/params'
import { selectedTrack } from '../state/store'
import { useActions, useApp, useLive } from './context'
import { Knob } from './Knob'

const HIGHLIGHT_MS = 900

export function KnobRow() {
  const track = useApp(selectedTrack)
  const touched = useLive((s) => s.touchedKnob)
  const { setParam } = useActions()
  const [, forceTick] = useState(0)

  // Re-renderiza quando o destaque do knob tocado deve apagar.
  useEffect(() => {
    if (!touched) return
    const timer = setTimeout(() => forceTick((n) => n + 1), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [touched])

  if (!track) return null
  const defs = paramsFor(track.kind)
  const highlightIndex = touched && performance.now() - touched.at < HIGHLIGHT_MS ? touched.index : -1

  return (
    <div className="knob-row">
      <div className="mirror-caption">
        Knobs controlam <strong style={{ color: track.color }}>{track.name}</strong>
      </div>
      <div className="knobs">
        {defs.map((def, i) => (
          <Knob
            key={i}
            number={i + 1}
            label={def.label}
            value={track.params[i]}
            valueText={describeParam(track.kind, i, track.params[i])}
            highlighted={highlightIndex === i}
            onChange={(v) => setParam(track.id, i, v)}
          />
        ))}
      </div>
    </div>
  )
}
