import { wrapTick } from './loop'
import type { NoteEvent } from './types'

/**
 * Notas recém-gravadas que já soaram ao vivo mas foram quantizadas para frente do cursor.
 * O agendador pula cada uma delas uma única vez, evitando que toquem em dobro (flam).
 */
export class SkipOnce {
  private readonly pending = new WeakSet<NoteEvent>()

  /** Marca o evento se o tick dele ainda está à frente do cursor nesta volta do loop. */
  markIfAhead(event: NoteEvent, currentTick: number, loopTicks: number): void {
    const ahead = wrapTick(event.tick - currentTick, loopTicks)
    if (ahead > 0 && ahead < loopTicks / 2) this.pending.add(event)
  }

  /** Retorna true (e esquece o evento) se ele deve ser pulado agora. */
  consume(event: NoteEvent): boolean {
    if (!this.pending.has(event)) return false
    this.pending.delete(event)
    return true
  }
}
