import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Instrument } from '../audio/instruments/types'
import { PPQ } from '../sequencer/types'
import { createProject } from '../state/project'
import { createAppStore, type AppStoreApi } from '../state/store'
import { CommandExecutor, type TransportLike } from './executor'

const fakeInstrument = (): Instrument => ({
  kind: 'synth',
  noteOn: vi.fn(),
  noteOff: vi.fn(),
  play: vi.fn(),
  applyParams: vi.fn(),
  setMix: vi.fn(),
  setPitchBend: vi.fn(),
  setModWheel: vi.fn(),
  setPressure: vi.fn(),
  allNotesOff: vi.fn(),
  dispose: vi.fn()
})

let store: AppStoreApi
let transport: TransportLike
let instruments: Map<string, Instrument>
let rack: { get: (id: string) => Instrument | undefined; allNotesOff: ReturnType<typeof vi.fn<() => void>> }
let exec: CommandExecutor
let drumsId: string
let synthId: string

const s = () => store.getState()
const takesOf = (id: string) => s().project.tracks.find((t) => t.id === id)!.takes

beforeEach(() => {
  store = createAppStore(createProject())
  ;[drumsId, synthId] = s().project.tracks.map((t) => t.id)
  transport = { ticks: 0, position: 0, start: vi.fn(), stop: vi.fn() }
  instruments = new Map([
    [drumsId, fakeInstrument()],
    [synthId, fakeInstrument()]
  ])
  rack = { get: (id) => instruments.get(id), allNotesOff: vi.fn<() => void>() }
  exec = new CommandExecutor(transport, rack, store)
})

describe('tocar notas', () => {
  it('note on/off chegam ao instrumento', () => {
    exec.run([{ type: 'noteOn', trackId: synthId, note: 60, velocity: 0.7 }])
    exec.run([{ type: 'noteOff', trackId: synthId, note: 60 }])
    expect(instruments.get(synthId)!.noteOn).toHaveBeenCalledWith(60, 0.7)
    expect(instruments.get(synthId)!.noteOff).toHaveBeenCalledWith(60)
  })

  it('note off vai para a faixa original mesmo depois de trocar de synth', () => {
    s().addTrack('synth')
    const second = s().project.tracks[2].id
    instruments.set(second, fakeInstrument())
    exec.run([{ type: 'noteOn', trackId: synthId, note: 60, velocity: 1 }])
    exec.run([{ type: 'noteOff', trackId: second, note: 60 }])
    expect(instruments.get(synthId)!.noteOff).toHaveBeenCalledWith(60)
    expect(instruments.get(second)!.noteOff).not.toHaveBeenCalled()
  })

  it('pressão, pitch e modulação chegam ao instrumento', () => {
    exec.run([
      { type: 'pressure', trackId: drumsId, value: 0.5 },
      { type: 'pitchBend', trackId: synthId, value: -1 },
      { type: 'modWheel', trackId: synthId, value: 0.2 }
    ])
    expect(instruments.get(drumsId)!.setPressure).toHaveBeenCalledWith(0.5)
    expect(instruments.get(synthId)!.setPitchBend).toHaveBeenCalledWith(-1)
    expect(instruments.get(synthId)!.setModWheel).toHaveBeenCalledWith(0.2)
  })

  it('knob altera o parâmetro no projeto', () => {
    exec.run([{ type: 'setParam', trackId: synthId, index: 0, value: 0 }])
    expect(s().project.tracks[1].params[0]).toBe(0)
  })
})

describe('transporte', () => {
  it('play inicia uma vez só', () => {
    exec.run([{ type: 'play' }, { type: 'play' }])
    expect(transport.start).toHaveBeenCalledTimes(1)
    expect(s().transport.playing).toBe(true)
  })

  it('stop tocando para; stop parado volta ao início', () => {
    exec.run([{ type: 'play' }])
    transport.position = '1:2:0'
    exec.run([{ type: 'stop' }])
    expect(transport.stop).toHaveBeenCalled()
    expect(rack.allNotesOff).toHaveBeenCalled()
    exec.run([{ type: 'stop' }])
    expect(transport.position).toBe(0)
    expect(s().status).toBe('Voltou ao início')
  })

  it('metrônomo e seleção', () => {
    exec.run([{ type: 'toggleMetronome' }, { type: 'selectIndex', index: 1 }])
    expect(s().transport.metronome).toBe(false)
    expect(s().selectedTrackId).toBe(synthId)
    exec.run([{ type: 'selectRelative', delta: -1 }])
    expect(s().selectedTrackId).toBe(drumsId)
  })
})

describe('gravação', () => {
  it('nota quantizada para frente do cursor é pulada uma vez pelo agendador', () => {
    exec.run([{ type: 'toggleRecord' }])
    transport.ticks = 80
    exec.run([{ type: 'noteOn', trackId: drumsId, note: 0, velocity: 1 }])
    exec.run([{ type: 'noteOff', trackId: drumsId, note: 0 }])
    const event = takesOf(drumsId)[0].events[0]
    expect(event.tick).toBe(96)
    expect(exec.skipOnce.consume(event)).toBe(true)
  })

  it('note-on repetido fecha a nota anterior em vez de perdê-la', () => {
    exec.run([{ type: 'toggleRecord' }])
    exec.run([{ type: 'noteOn', trackId: synthId, note: 60, velocity: 1 }])
    transport.ticks = PPQ
    exec.run([{ type: 'noteOn', trackId: synthId, note: 60, velocity: 1 }])
    exec.run([{ type: 'noteOff', trackId: synthId, note: 60 }])
    expect(takesOf(synthId)[0].events).toHaveLength(2)
  })

  it('transporte fica bloqueado durante a exportação', () => {
    exec.setLocked(true)
    exec.run([{ type: 'play' }, { type: 'toggleRecord' }])
    expect(transport.start).not.toHaveBeenCalled()
    expect(s().status).toContain('exportando')
    exec.setLocked(false)
    exec.run([{ type: 'play' }])
    expect(transport.start).toHaveBeenCalled()
  })

  it('grava notas quantizadas em um take que toca na próxima volta', () => {
    exec.run([{ type: 'toggleRecord' }])
    expect(s().transport).toMatchObject({ playing: true, recording: true })

    transport.ticks = 50
    exec.run([{ type: 'noteOn', trackId: drumsId, note: 0, velocity: 1 }])
    transport.ticks = 60
    exec.run([{ type: 'noteOff', trackId: drumsId, note: 0 }])
    transport.ticks = PPQ
    exec.run([{ type: 'noteOn', trackId: drumsId, note: 1, velocity: 0.5 }])
    exec.run([{ type: 'noteOff', trackId: drumsId, note: 1 }])

    const takes = takesOf(drumsId)
    expect(takes).toHaveLength(1)
    expect(takes[0].events.map((e) => [e.tick, e.note])).toEqual([
      [48, 0],
      [PPQ, 1]
    ])
  })

  it('não grava se não estiver gravando', () => {
    exec.run([{ type: 'play' }])
    exec.run([{ type: 'noteOn', trackId: drumsId, note: 0, velocity: 1 }])
    exec.run([{ type: 'noteOff', trackId: drumsId, note: 0 }])
    expect(takesOf(drumsId)).toEqual([])
  })

  it('encerrar gravação fecha notas presas e o próximo record cria outro take', () => {
    exec.run([{ type: 'toggleRecord' }])
    exec.run([{ type: 'noteOn', trackId: synthId, note: 60, velocity: 1 }])
    transport.ticks = PPQ
    exec.run([{ type: 'toggleRecord' }])
    expect(takesOf(synthId)[0].events[0]).toMatchObject({ note: 60, duration: PPQ })

    exec.run([{ type: 'toggleRecord' }])
    exec.run([{ type: 'noteOn', trackId: synthId, note: 62, velocity: 1 }])
    exec.run([{ type: 'noteOff', trackId: synthId, note: 62 }])
    expect(takesOf(synthId)).toHaveLength(2)
  })

  it('parar durante a gravação salva o que foi tocado', () => {
    exec.run([{ type: 'toggleRecord' }])
    exec.run([{ type: 'noteOn', trackId: synthId, note: 60, velocity: 1 }])
    exec.run([{ type: 'stop' }])
    expect(takesOf(synthId)).toHaveLength(1)
    expect(s().transport.recording).toBe(false)
  })

  it('desfazer remove o último take e avisa quando não há nada', () => {
    exec.run([{ type: 'undoTake', trackId: drumsId }])
    expect(s().status).toContain('Nada para desfazer')
    exec.run([{ type: 'toggleRecord' }])
    exec.run([{ type: 'noteOn', trackId: drumsId, note: 0, velocity: 1 }])
    exec.run([{ type: 'noteOff', trackId: drumsId, note: 0 }])
    exec.run([{ type: 'undoTake', trackId: drumsId }])
    expect(takesOf(drumsId)).toEqual([])
  })
})
