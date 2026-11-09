import { useEffect } from 'react'
import type { Runtime } from '../runtime/runtime'
import type { AppStoreApi } from '../state/store'
import { useRuntime, useStoreApi } from './context'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement

function handlerFor(e: KeyboardEvent, runtime: Runtime, store: AppStoreApi): (() => void) | null {
  const s = store.getState()
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (e.ctrlKey || e.metaKey) {
    if (key === 's') return () => void runtime.saveProject()
    if (key === 'o') return () => void runtime.openProject()
    if (key === 'z') return () => runtime.run([{ type: 'undoTake', trackId: s.selectedTrackId }])
    return null
  }
  if (key === ' ') return () => runtime.run([{ type: s.transport.playing ? 'stop' : 'play' }])
  if (key === 'r') return () => runtime.run([{ type: 'toggleRecord' }])
  if (key === 'ArrowUp') return () => s.selectRelative(-1)
  if (key === 'ArrowDown') return () => s.selectRelative(1)
  return null
}

/** Atalhos do teclado do PC: Espaço, R, Ctrl+S, Ctrl+O, Ctrl+Z, setas. */
export function useShortcuts(): void {
  const runtime = useRuntime()
  const store = useStoreApi()

  useEffect(() => {
    if (!runtime) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const handler = handlerFor(e, runtime, store)
      if (!handler) return
      e.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runtime, store])
}
