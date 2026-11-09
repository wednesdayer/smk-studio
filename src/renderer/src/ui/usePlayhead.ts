import { useEffect, useState } from 'react'
import * as Tone from 'tone'
import { PPQ, loopTicksFor } from '../sequencer/types'
import { useApp } from './context'

/** Posição do loop (0..1) e compasso/tempo atuais, atualizados a cada frame enquanto toca. */
export function usePlayhead(): { progress: number; bar: number; beat: number } {
  const playing = useApp((s) => s.transport.playing)
  const loopBars = useApp((s) => s.project.loopBars)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      setTicks(Tone.getTransport().ticks)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const loopTicks = loopTicksFor(loopBars)
  const inLoop = ((ticks % loopTicks) + loopTicks) % loopTicks
  return {
    progress: inLoop / loopTicks,
    bar: Math.floor(inLoop / (PPQ * 4)) + 1,
    beat: Math.floor((inLoop % (PPQ * 4)) / PPQ) + 1
  }
}
