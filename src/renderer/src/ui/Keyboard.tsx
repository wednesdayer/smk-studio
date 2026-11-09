import { KEY_RANGE } from '../controller/smk25Profile'
import { useApp, useLive, useRuntime } from './context'

const BLACK_KEYS = new Set([1, 3, 6, 8, 10])
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CLICK_VELOCITY = 0.8

const notes = Array.from({ length: KEY_RANGE.high - KEY_RANGE.low + 1 }, (_, i) => KEY_RANGE.low + i)
const whiteNotes = notes.filter((n) => !BLACK_KEYS.has(n % 12))

export function Keyboard() {
  const runtime = useRuntime()
  const keys = useLive((s) => s.keys)
  const pitchBend = useLive((s) => s.pitchBend)
  const modWheel = useLive((s) => s.modWheel)
  const target = useApp((s) => s.project.tracks.find((t) => t.id === s.activeSynthId))

  const press = (note: number, on: boolean) => runtime?.dispatch({ kind: 'key', note, velocity: on ? CLICK_VELOCITY : 0, on })
  const whiteWidth = 100 / whiteNotes.length

  return (
    <div className="keyboard-section">
      <div className="mirror-caption">
        Teclas tocam <strong style={{ color: target?.color }}>{target?.name ?? 'nenhum synth'}</strong>
      </div>
      <div className="keyboard-row">
        <div className="wheels">
          <Wheel label="Pitch" value={(pitchBend + 1) / 2} centered />
          <Wheel label="Mod" value={modWheel} />
        </div>
        <div className="keyboard" style={{ ['--track-color' as string]: target?.color ?? '#888' }}>
          {notes.map((note) => {
            const black = BLACK_KEYS.has(note % 12)
            const whiteIndex = whiteNotes.filter((w) => w < note).length
            const left = black ? whiteIndex * whiteWidth - whiteWidth * 0.3 : whiteIndex * whiteWidth
            return (
              <div
                key={note}
                className={`key ${black ? 'black' : 'white'} ${keys.has(note) ? 'down' : ''}`}
                style={{ left: `${left}%`, width: `${black ? whiteWidth * 0.6 : whiteWidth}%` }}
                onPointerDown={() => press(note, true)}
                onPointerUp={() => press(note, false)}
                onPointerLeave={() => keys.has(note) && press(note, false)}
              >
                {!black && note % 12 === 0 && <span className="key-label">{NOTE_NAMES[0]}{Math.floor(note / 12) - 1}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Wheel({ label, value, centered = false }: { label: string; value: number; centered?: boolean }) {
  const top = centered ? Math.min(value, 0.5) : 0
  const height = centered ? Math.abs(value - 0.5) : value
  return (
    <div className="wheel" title={centered ? 'Pitch bend: ±2 semitons' : 'Modulação: vibrato'}>
      <div className="wheel-track">
        <div className="wheel-fill" style={{ bottom: `${top * 100}%`, height: `${height * 100}%` }} />
        {centered && <div className="wheel-center" />}
      </div>
      <span>{label}</span>
    </div>
  )
}
