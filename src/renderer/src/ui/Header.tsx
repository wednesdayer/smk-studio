import { useActions, useApp, useLive, useRuntime } from './context'

export function Header() {
  const runtime = useRuntime()
  const name = useApp((s) => s.project.name)
  const midi = useLive((s) => s.midi)
  const { newProject } = useActions()

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark">◆</span> SMK Studio
      </div>
      <div className="project-name" title="Nome do projeto">{name}</div>
      <div className={`midi-pill midi-${midi.state}`} title={midi.message}>
        <span className="dot" /> {midi.state === 'connected' ? 'SMK25 conectado' : midi.message}
      </div>
      <nav className="file-actions">
        <button onClick={newProject}>Novo</button>
        <button onClick={() => runtime?.openProject()} disabled={!runtime}>Abrir</button>
        <button onClick={() => runtime?.saveProject()} disabled={!runtime}>Salvar</button>
        <button className="accent" onClick={() => runtime?.exportWav()} disabled={!runtime}>Exportar WAV</button>
      </nav>
    </header>
  )
}
