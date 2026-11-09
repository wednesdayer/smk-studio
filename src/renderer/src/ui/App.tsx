import { useEffect, useMemo, useState } from 'react'
import { createRuntime, type Runtime } from '../runtime/runtime'
import { createAppStore } from '../state/store'
import { ButtonLegend } from './ButtonLegend'
import { AppContext, useApp } from './context'
import { Header } from './Header'
import { Keyboard } from './Keyboard'
import { KnobRow } from './KnobRow'
import { LoopView } from './LoopView'
import { PadGrid } from './PadGrid'
import { TrackList } from './TrackList'
import { TransportBar } from './TransportBar'
import { useShortcuts } from './useShortcuts'

export function App() {
  const store = useMemo(() => createAppStore(), [])
  const [runtime, setRuntime] = useState<Runtime | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let created: Runtime | null = null
    createRuntime(store)
      .then((rt) => {
        created = rt
        if (disposed) rt.dispose()
        else setRuntime(rt)
      })
      .catch((e: unknown) => setError(`Não foi possível iniciar o áudio: ${String(e)}`))
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [store])

  const value = useMemo(() => ({ store, runtime }), [store, runtime])

  return (
    <AppContext.Provider value={value}>
      <Shell error={error} />
    </AppContext.Provider>
  )
}

function Shell({ error }: { error: string | null }) {
  useShortcuts()
  const status = useApp((s) => s.status)

  return (
    <div className="app">
      <Header />
      <TransportBar />
      <main className="workspace">
        <TrackList />
        <LoopView />
      </main>
      <section className="mirror">
        <KnobRow />
        <div className="mirror-bottom">
          <PadGrid />
          <Keyboard />
          <ButtonLegend />
        </div>
      </section>
      <footer className={`status ${error ? 'error' : ''}`}>{error ?? status}</footer>
    </div>
  )
}
