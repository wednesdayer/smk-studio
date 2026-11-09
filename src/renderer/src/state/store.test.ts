import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_TRACKS, createProject } from './project'
import { createAppStore, selectedTrack, type AppStoreApi } from './store'

let store: AppStoreApi
const s = () => store.getState()
const trackIds = () => s().project.tracks.map((t) => t.id)

beforeEach(() => {
  store = createAppStore(createProject())
})

describe('seleção de faixas', () => {
  it('começa com a primeira faixa e define alvos de teclas e pads', () => {
    const [drums, synth] = trackIds()
    expect(s().selectedTrackId).toBe(drums)
    expect(s().activeDrumsId).toBe(drums)
    expect(s().activeSynthId).toBe(synth)
  })

  it('selecionar um synth muda o alvo das teclas mas mantém o dos pads', () => {
    s().addTrack('synth')
    const newSynth = trackIds()[2]
    expect(s().activeSynthId).toBe(newSynth)
    expect(s().activeDrumsId).toBe(trackIds()[0])
  })

  it('navega com limites', () => {
    s().selectRelative(1)
    expect(s().selectedTrackId).toBe(trackIds()[1])
    s().selectRelative(5)
    expect(s().selectedTrackId).toBe(trackIds()[1])
    s().selectRelative(-9)
    expect(s().selectedTrackId).toBe(trackIds()[0])
  })

  it('selecionar índice inexistente não faz nada', () => {
    s().selectTrackByIndex(9)
    expect(s().selectedTrackId).toBe(trackIds()[0])
  })

  it('selecionar id inexistente não faz nada', () => {
    s().selectTrack('nope')
    expect(s().selectedTrackId).toBe(trackIds()[0])
  })

  it('selectedTrack devolve a faixa atual', () => {
    expect(selectedTrack(s())?.kind).toBe('drums')
  })
})

describe('faixas', () => {
  it('remove faixa e reajusta seleção e alvos', () => {
    const [drums, synth] = trackIds()
    s().removeTrack(drums)
    expect(trackIds()).toEqual([synth])
    expect(s().selectedTrackId).toBe(synth)
    expect(s().activeDrumsId).toBeNull()
  })

  it('não remove a última faixa', () => {
    s().removeTrack(trackIds()[0])
    s().removeTrack(trackIds()[0])
    expect(trackIds()).toHaveLength(1)
    expect(s().status).toContain('pelo menos uma')
  })

  it('respeita o limite de faixas', () => {
    for (let i = 0; i < MAX_TRACKS + 2; i++) s().addTrack('synth')
    expect(trackIds()).toHaveLength(MAX_TRACKS)
    expect(s().status).toContain('Limite')
  })

  it('renomeia ignorando nome vazio', () => {
    const id = trackIds()[0]
    s().renameTrack(id, '  Batidas  ')
    expect(s().project.tracks[0].name).toBe('Batidas')
    s().renameTrack(id, '   ')
    expect(s().project.tracks[0].name).toBe('Batidas')
  })

  it('setParam altera só o knob certo e limita 0..1', () => {
    const id = trackIds()[1]
    const before = s().project.tracks[1].params
    s().setParam(id, 2, 5)
    const after = s().project.tracks[1].params
    expect(after[2]).toBe(1)
    expect(after.filter((_, i) => i !== 2)).toEqual(before.filter((_, i) => i !== 2))
    expect(before).not.toBe(after)
  })

  it('volume, mute e solo', () => {
    const id = trackIds()[0]
    s().setVolume(id, -1)
    s().toggleMute(id)
    s().toggleSolo(id)
    expect(s().project.tracks[0]).toMatchObject({ volume: 0, muted: true, solo: true })
  })
})

describe('gravação', () => {
  const ev = { tick: 0, note: 0, velocity: 1, duration: 10 }

  it('adiciona take, desfaz e limpa', () => {
    const id = trackIds()[0]
    s().addTake(id, [ev])
    s().addTake(id, [ev, ev])
    expect(s().project.tracks[0].takes).toHaveLength(2)
    s().undoTake(id)
    expect(s().project.tracks[0].takes[0].events).toHaveLength(1)
    s().clearTrack(id)
    expect(s().project.tracks[0].takes).toEqual([])
  })

  it('recordEvent cria o take na primeira nota e acrescenta nas seguintes', () => {
    const id = trackIds()[1]
    s().recordEvent(id, 'take-x', ev)
    s().recordEvent(id, 'take-x', { ...ev, tick: 48 })
    s().recordEvent(id, 'take-y', ev)
    const takes = s().project.tracks[1].takes
    expect(takes.map((t) => t.id)).toEqual(['take-x', 'take-y'])
    expect(takes[0].events.map((e) => e.tick)).toEqual([0, 48])
  })

  it('ignora take vazio', () => {
    s().addTake(trackIds()[0], [])
    expect(s().project.tracks[0].takes).toEqual([])
  })
})

describe('projeto e transporte', () => {
  it('limita BPM e compassos', () => {
    s().setBpm(500)
    s().setLoopBars(0)
    s().setQuantize('1/8')
    expect(s().project).toMatchObject({ bpm: 240, loopBars: 1, quantize: '1/8' })
  })

  it('parar também desliga a gravação', () => {
    s().setPlaying(true)
    s().setRecording(true)
    s().setPlaying(false)
    expect(s().transport).toMatchObject({ playing: false, recording: false })
  })

  it('metrônomo alterna', () => {
    s().toggleMetronome()
    expect(s().transport.metronome).toBe(false)
  })

  it('carregar e criar projeto reiniciam a seleção', () => {
    const other = createProject()
    s().loadProject(other)
    expect(s().selectedTrackId).toBe(other.tracks[0].id)
    s().newProject()
    expect(s().project.name).toBe('Novo projeto')
  })
})
