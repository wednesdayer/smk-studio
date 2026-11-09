import type { QuantizeGrid } from '../sequencer/types'
import { useActions, useApp, useRuntime } from './context'
import { usePlayhead } from './usePlayhead'

const GRIDS: readonly QuantizeGrid[] = ['off', '1/8', '1/16', '1/32']
const BAR_OPTIONS = [1, 2, 4, 8] as const

export function TransportBar() {
  const runtime = useRuntime()
  const { playing, recording, metronome } = useApp((s) => s.transport)
  const bpm = useApp((s) => s.project.bpm)
  const loopBars = useApp((s) => s.project.loopBars)
  const quantize = useApp((s) => s.project.quantize)
  const { setBpm, setLoopBars, setQuantize, toggleMetronome } = useActions()
  const { progress, bar, beat } = usePlayhead()

  return (
    <section className="transport">
      <div className="transport-buttons">
        <button className={`tbtn ${playing ? 'on' : ''}`} onClick={() => runtime?.run([{ type: 'play' }])} title="Tocar (Espaço)">▶</button>
        <button className="tbtn" onClick={() => runtime?.run([{ type: 'stop' }])} title="Parar (Espaço) / 2x volta ao início">■</button>
        <button className={`tbtn rec ${recording ? 'on' : ''}`} onClick={() => runtime?.run([{ type: 'toggleRecord' }])} title="Gravar (R)">●</button>
      </div>

      <div className="counter">
        <span className="counter-value">{playing ? `${bar}.${beat}` : '1.1'}</span>
        <span className="counter-label">compasso.tempo</span>
      </div>

      <label className="field">
        BPM
        <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value) || bpm)} />
      </label>

      <label className="field">
        Loop
        <select value={loopBars} onChange={(e) => setLoopBars(Number(e.target.value))}>
          {BAR_OPTIONS.map((b) => <option key={b} value={b}>{b} {b === 1 ? 'compasso' : 'compassos'}</option>)}
        </select>
      </label>

      <label className="field">
        Grade
        <select value={quantize} onChange={(e) => setQuantize(e.target.value as QuantizeGrid)}>
          {GRIDS.map((g) => <option key={g} value={g}>{g === 'off' ? 'livre' : g}</option>)}
        </select>
      </label>

      <button className={`chip ${metronome ? 'on' : ''}`} onClick={toggleMetronome} title="Metrônomo (botão » do teclado)">
        ♩ Metrônomo
      </button>

      <div className="loop-progress" aria-label="Posição no loop">
        {Array.from({ length: loopBars }, (_, i) => <span key={i} className="bar-tick" style={{ left: `${(i / loopBars) * 100}%` }} />)}
        <div className={`loop-fill ${recording ? 'rec' : ''}`} style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  )
}
