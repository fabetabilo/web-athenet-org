import { Subject, of, throwError } from 'rxjs';
import { LiveScoreSync } from './live-score-sync';
import type { LiveScoreWrite } from '../../services/delegate-bff';

describe('LiveScoreSync', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('colapsa clics rápidos dentro del debounce en un solo envío con el último marcador', () => {
    const sent: LiveScoreWrite[] = [];
    const sync = new LiveScoreSync(
      (score) => {
        sent.push(score);
        return of(void 0);
      },
      vi.fn(),
      150,
    );

    sync.enqueue({ homeScore: 1, awayScore: 0 });
    vi.advanceTimersByTime(50);
    sync.enqueue({ homeScore: 2, awayScore: 0 });
    vi.advanceTimersByTime(50);
    sync.enqueue({ homeScore: 2, awayScore: 1 });

    expect(sent).toEqual([]);
    vi.advanceTimersByTime(150);
    expect(sent).toEqual([{ homeScore: 2, awayScore: 1 }]);
  });

  it('serializa los envíos: mientras hay uno en vuelo, conserva solo el último valor y lo envía al terminar', () => {
    const first$ = new Subject<void>();
    const second$ = new Subject<void>();
    const sent: LiveScoreWrite[] = [];
    const responses = [first$, second$];

    const sync = new LiveScoreSync(
      (score) => {
        sent.push(score);
        return responses.shift()!;
      },
      vi.fn(),
      150,
    );

    sync.enqueue({ homeScore: 1, awayScore: 0 });
    vi.advanceTimersByTime(150);
    expect(sent).toEqual([{ homeScore: 1, awayScore: 0 }]);

    // Llegan varios clics mientras el primer POST aún no responde
    sync.enqueue({ homeScore: 2, awayScore: 0 });
    sync.enqueue({ homeScore: 3, awayScore: 0 });
    sync.enqueue({ homeScore: 3, awayScore: 1 });
    expect(sent).toHaveLength(1);

    // Al completarse el primero, se despacha el último marcador acumulado
    first$.next();
    first$.complete();
    expect(sent).toEqual([
      { homeScore: 1, awayScore: 0 },
      { homeScore: 3, awayScore: 1 },
    ]);

    const onIdle = vi.fn();
    sync.whenIdle(onIdle);
    expect(onIdle).not.toHaveBeenCalled();

    second$.next();
    second$.complete();
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('avisa una vez por racha de fallos y vuelve a intentar en el siguiente cambio', () => {
    let shouldFail = true;
    const sent: LiveScoreWrite[] = [];
    const onError = vi.fn();

    const sync = new LiveScoreSync(
      (score) => {
        sent.push(score);
        return shouldFail ? throwError(() => new Error('503')) : of(void 0);
      },
      onError,
      150,
    );

    sync.enqueue({ homeScore: 1, awayScore: 0 });
    vi.advanceTimersByTime(150);
    expect(onError).toHaveBeenCalledTimes(1);

    // Segundo fallo seguido: no repite el toast
    sync.enqueue({ homeScore: 2, awayScore: 0 });
    vi.advanceTimersByTime(150);
    expect(onError).toHaveBeenCalledTimes(1);

    // Se recupera y envía el último valor
    shouldFail = false;
    sync.enqueue({ homeScore: 3, awayScore: 0 });
    vi.advanceTimersByTime(150);
    expect(sent).toEqual([
      { homeScore: 1, awayScore: 0 },
      { homeScore: 2, awayScore: 0 },
      { homeScore: 3, awayScore: 0 },
    ]);
  });

  it('cancelPending evita que un debounce pendiente salga después de finalizar', () => {
    const send = vi.fn().mockReturnValue(of(void 0));
    const sync = new LiveScoreSync(send, vi.fn(), 150);

    sync.enqueue({ homeScore: 1, awayScore: 0 });
    sync.cancelPending();
    vi.advanceTimersByTime(200);

    expect(send).not.toHaveBeenCalled();
  });
});
