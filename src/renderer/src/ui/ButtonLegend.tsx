import { BUTTON_ACTIONS } from '../controller/router'
import type { ButtonId } from '../controller/smk25Profile'

const ORDER: readonly { id: ButtonId; icon: string }[] = [
  { id: 'rewind', icon: '«' },
  { id: 'forward', icon: '»' },
  { id: 'stop', icon: '■' },
  { id: 'play', icon: '▶' },
  { id: 'record', icon: '●' },
  { id: 'up', icon: '▲' },
  { id: 'down', icon: '▼' },
  { id: 'track1', icon: '1–4' }
]

/** Cola na tela: o que cada botão físico do SMK25 faz aqui. */
export function ButtonLegend() {
  return (
    <div className="legend">
      <div className="mirror-caption">Botões do teclado</div>
      <ul>
        {ORDER.map(({ id, icon }) => (
          <li key={id}>
            <span className="legend-icon">{icon}</span>
            <span>{id === 'track1' ? 'Selecionar faixa 1 a 4' : BUTTON_ACTIONS[id]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
