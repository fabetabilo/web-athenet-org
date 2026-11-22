import { Observable, Subscription } from 'rxjs';
import type { LiveScoreWrite } from '../../services/delegate-bff';

/**
 * Cola serializada "último valor gana" con debounce corto para el marcador en vivo.
 * - Agrupa clics rápidos dentro de `debounceMs` en un solo request.
 * - Nunca deja dos POST en vuelo simultáneamente (evita desorden en el servidor).
 * - Si llegan cambios mientras hay un request en vuelo, conserva solo el último
 *   marcador absoluto y lo envía al terminar el actual.
 * - Ante error, avisa una vez por racha y reintenta en el próximo cambio.
 */
export class LiveScoreSync {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Subscription | null = null;
  private sending = false;
  private pending: LiveScoreWrite | null = null;
  private idleCallbacks: Array<() => void> = [];
  private notifiedFailure = false;
  private destroyed = false;

  constructor(
    private readonly send: (score: LiveScoreWrite) => Observable<void>,
    private readonly onError: (err: unknown) => void,
    private readonly debounceMs = 150,
  ) {}

  enqueue(score: LiveScoreWrite): void {
    if (this.destroyed) return;
    this.pending = { homeScore: score.homeScore, awayScore: score.awayScore };

    if (this.sending) {
      // Ya hay un request en vuelo: cuando termine, recogerá este `pending`.
      return;
    }

    this.clearTimer();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushNext();
    }, this.debounceMs);
  }

  /** Descarta envíos pendientes que aún no salieron (p. ej. antes de finalizar el partido). */
  cancelPending(): void {
    this.clearTimer();
    this.pending = null;
  }

  /** Ejecuta `fn` de inmediato si no hay request en vuelo, o al terminar el actual. */
  whenIdle(fn: () => void): void {
    if (this.destroyed) return;
    if (!this.sending) {
      fn();
      return;
    }
    this.idleCallbacks.push(fn);
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimer();
    this.pending = null;
    this.idleCallbacks = [];
    this.sending = false;
    this.inFlight?.unsubscribe();
    this.inFlight = null;
  }

  private flushNext(): void {
    if (this.destroyed || this.sending || !this.pending) {
      this.notifyIdleIfReady();
      return;
    }

    const next = this.pending;
    this.pending = null;
    this.sending = true;

    const sub = this.send(next).subscribe({
      next: () => {
        this.notifiedFailure = false;
      },
      error: (err: unknown) => {
        this.sending = false;
        this.inFlight = null;
        if (!this.destroyed && !this.notifiedFailure) {
          this.notifiedFailure = true;
          this.onError(err);
        }
        // Si hubo un clic más reciente mientras fallaba este, lo enviamos ahora.
        if (this.pending) {
          this.flushNext();
        } else {
          this.notifyIdleIfReady();
        }
      },
      complete: () => {
        this.sending = false;
        this.inFlight = null;
        if (this.pending) {
          this.flushNext();
        } else {
          this.notifyIdleIfReady();
        }
      },
    });
    if (this.sending) {
      this.inFlight = sub;
    }
  }

  private notifyIdleIfReady(): void {
    if (this.sending || this.idleCallbacks.length === 0) return;
    const callbacks = this.idleCallbacks.splice(0);
    for (const cb of callbacks) cb();
  }

  private clearTimer(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
