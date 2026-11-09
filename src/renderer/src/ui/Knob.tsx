import { useRef } from 'react'

interface Props {
  readonly label: string
  readonly valueText: string
  readonly value: number
  readonly number: number
  readonly highlighted: boolean
  readonly onChange: (value: number) => void
}

const SWEEP_DEGREES = 270
const DRAG_PIXELS_FOR_FULL_TURN = 200

/** Knob na tela: espelha o físico e também pode ser arrastado com o mouse (para cima/baixo). */
export function Knob({ label, valueText, value, number, highlighted, onChange }: Props) {
  const drag = useRef<{ y: number; start: number } | null>(null)
  const angle = -SWEEP_DEGREES / 2 + value * SWEEP_DEGREES

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, start: value }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const delta = (drag.current.y - e.clientY) / DRAG_PIXELS_FOR_FULL_TURN
    onChange(Math.min(1, Math.max(0, drag.current.start + delta)))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <div className={`knob ${highlighted ? 'touched' : ''}`}>
      <div className="knob-number">K{number}</div>
      <div
        className="knob-dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(value * 100)}
      >
        <svg viewBox="0 0 64 64">
          <circle className="knob-track" cx="32" cy="32" r="26" pathLength={360} strokeDasharray={`${SWEEP_DEGREES} 360`} transform="rotate(135 32 32)" />
          <circle className="knob-value" cx="32" cy="32" r="26" pathLength={360} strokeDasharray={`${value * SWEEP_DEGREES} 360`} transform="rotate(135 32 32)" />
          <line className="knob-pointer" x1="32" y1="32" x2="32" y2="12" transform={`rotate(${angle} 32 32)`} />
        </svg>
      </div>
      <div className="knob-label">{label}</div>
      <div className="knob-value-text">{valueText}</div>
    </div>
  )
}
