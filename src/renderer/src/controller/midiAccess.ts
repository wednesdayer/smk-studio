import type { MidiStatus } from '../state/liveStore'
import type { ControllerEvent } from './events'
import { parseMessage } from './parseMessage'
import { detectPortRole } from './smk25Profile'

type Listener = (event: ControllerEvent) => void
type StatusListener = (status: MidiStatus) => void

/**
 * Conecta em todas as portas do SMK25 e reconecta sozinho quando o cabo
 * ou o Bluetooth entram e saem.
 *
 * O Chromium devolve os MESMOS objetos de porta para cada requestMIDIAccess, então
 * cada conexão adiciona e remove apenas o próprio listener (nunca `onmidimessage = null`),
 * senão uma conexão descartada desliga a outra.
 */
export async function connectController(onEvent: Listener, onStatus: StatusListener): Promise<() => void> {
  if (!navigator.requestMIDIAccess) {
    onStatus({ state: 'unsupported', ports: [], message: 'Este ambiente não suporta MIDI.' })
    return () => undefined
  }

  let access: MIDIAccess
  try {
    access = await navigator.requestMIDIAccess({ sysex: false })
  } catch (error) {
    onStatus({ state: 'error', ports: [], message: `Sem permissão para MIDI: ${String(error)}` })
    return () => undefined
  }

  const attached = new Map<MIDIInput, (msg: MIDIMessageEvent) => void>()

  const detach = (input: MIDIInput) => {
    const handler = attached.get(input)
    if (handler) input.removeEventListener('midimessage', handler)
    attached.delete(input)
  }

  const attach = () => {
    const connected: string[] = []
    access.inputs.forEach((input) => {
      const role = detectPortRole(input.name ?? '')
      const usable = role !== 'unknown' && role !== 'duplicate' && input.state === 'connected'
      if (!usable) return detach(input)
      if (!attached.has(input)) {
        const handler = (msg: MIDIMessageEvent) => {
          const event = msg.data ? parseMessage(role, msg.data) : null
          if (event) onEvent(event)
        }
        input.addEventListener('midimessage', handler)
        attached.set(input, handler)
        input.open().catch((error: unknown) =>
          onStatus({ state: 'error', ports: [], message: `Não foi possível abrir ${input.name}: ${String(error)}` })
        )
      }
      connected.push(input.name ?? role)
    })
    onStatus(
      connected.length > 0
        ? { state: 'connected', ports: connected, message: `SMK25 conectado (${connected.join(', ')})` }
        : { state: 'disconnected', ports: [], message: 'SMK25 não encontrado. Conecte o cabo USB.' }
    )
  }

  attach()
  access.addEventListener('statechange', attach)

  return () => {
    access.removeEventListener('statechange', attach)
    ;[...attached.keys()].forEach(detach)
  }
}
