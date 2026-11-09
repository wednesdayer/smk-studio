import { startAudioEngine, type AudioEngine } from '../audio/engine'
import { renderLoopToWav } from '../audio/exporter'
import { InstrumentRack } from '../audio/rack'
import { createTransportSync, startScheduler } from '../audio/scheduler'
import type { ControllerEvent } from '../controller/events'
import { connectController } from '../controller/midiAccess'
import { routeEvent, type Command } from '../controller/router'
import { BEATS_PER_BAR } from '../sequencer/types'
import { liveStore, reduceLive, type MidiStatus } from '../state/liveStore'
import { parseProject, serializeProject } from '../state/project'
import type { AppStoreApi } from '../state/store'
import { CommandExecutor } from './executor'

const EXPORT_REPEATS = 2

export interface Runtime {
  /** Mesmo caminho do hardware: usado pelos cliques na tela. */
  dispatch(event: ControllerEvent): void
  run(commands: readonly Command[]): void
  saveProject(): Promise<void>
  openProject(): Promise<void>
  exportWav(): Promise<void>
  dispose(): void
}

export async function createRuntime(store: AppStoreApi): Promise<Runtime> {
  const engine = await startAudioEngine()
  const rack = new InstrumentRack(engine.master)
  const executor = new CommandExecutor(engine.transport, rack, store)

  const syncTransport = createTransportSync(engine)
  const syncAll = () => {
    const { project } = store.getState()
    rack.sync(project.tracks)
    syncTransport(project.bpm, project.loopBars)
  }
  syncAll()
  const unsubscribe = store.subscribe(syncAll)
  const stopScheduler = startScheduler(engine, rack, store, executor.skipOnce)
  liveStore.setState({ audioReady: true })

  const dispatch = (event: ControllerEvent) => {
    liveStore.setState(reduceLive(liveStore.getState(), event, performance.now()))
    executor.run(routeEvent(event, store.getState()))
  }
  const onMidiStatus = (midi: MidiStatus) => {
    const lostPorts = midi.ports.length < liveStore.getState().midi.ports.length
    if (lostPorts) {
      // Cabo ou Bluetooth caiu com teclas apertadas: o note-off nunca vai chegar.
      rack.allNotesOff()
      liveStore.setState({ keys: new Set(), pads: new Set(), padPressure: 0 })
    }
    liveStore.setState({ midi })
  }
  const disconnect = await connectController(dispatch, onMidiStatus)
  // Gancho de diagnóstico (app offline): permite inspecionar o motor pelo DevTools.
  ;(window as unknown as Record<string, unknown>).__smk = { engine, rack, store, executor, liveStore, dispatch }

  return {
    dispatch,
    run: (commands) => executor.run(commands),
    saveProject: () => saveProject(store),
    openProject: () => openProject(store, executor),
    exportWav: () => exportWav(store, engine, executor),
    dispose() {
      disconnect()
      stopScheduler()
      unsubscribe()
      rack.dispose()
    }
  }
}

async function saveProject(store: AppStoreApi): Promise<void> {
  const { project, setStatus } = store.getState()
  try {
    const path = await window.api.saveProject(project.name, serializeProject(project))
    setStatus(path ? `Projeto salvo em ${path}` : 'Salvamento cancelado')
  } catch (error) {
    setStatus(`Erro ao salvar: ${String(error)}`)
  }
}

async function openProject(store: AppStoreApi, executor: CommandExecutor): Promise<void> {
  const { setStatus, loadProject } = store.getState()
  try {
    const file = await window.api.openProject()
    if (!file) return setStatus('Abertura cancelada')
    const result = parseProject(file.content)
    if (!result.ok) return setStatus(result.error)
    executor.stop()
    loadProject(result.project)
    setStatus(`Projeto aberto: ${file.path}`)
  } catch (error) {
    setStatus(`Erro ao abrir: ${String(error)}`)
  }
}

async function exportWav(store: AppStoreApi, engine: AudioEngine, executor: CommandExecutor): Promise<void> {
  const { project, setStatus, setPlaying } = store.getState()
  if (store.getState().transport.playing) executor.stop()
  const loopSeconds = (60 / project.bpm) * BEATS_PER_BAR * project.loopBars
  executor.setLocked(true)
  try {
    setStatus(`Exportando: tocando o loop ${EXPORT_REPEATS}x...`)
    setPlaying(true)
    const wav = await renderLoopToWav(engine, loopSeconds, EXPORT_REPEATS)
    const path = await window.api.saveWav(project.name, wav)
    setStatus(path ? `WAV exportado em ${path}` : 'Exportação cancelada')
  } catch (error) {
    setStatus(`Erro ao exportar: ${String(error)}`)
  } finally {
    setPlaying(false)
    executor.setLocked(false)
  }
}
