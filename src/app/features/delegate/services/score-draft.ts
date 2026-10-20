/**
 * Marcador de un partido en juego. El backend solo guarda el resultado final,
 * así que el marcador en curso vive en este dispositivo: sobrevive a una
 * recarga y al cierre de sesión (que solo borra sus propias claves).
 */
export interface ScoreDraft { home: number; away: number; }

const KEY_PREFIX = 'athenet:delegate:score:';

function isScore(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function loadScoreDraft(matchId: number): ScoreDraft | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + matchId);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<ScoreDraft>;
    return isScore(draft?.home) && isScore(draft?.away) ? { home: draft.home, away: draft.away } : null;
  } catch {
    return null;
  }
}

export function saveScoreDraft(matchId: number, draft: ScoreDraft): void {
  try {
    localStorage.setItem(KEY_PREFIX + matchId, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): el marcador sigue en memoria.
  }
}

export function clearScoreDraft(matchId: number): void {
  try {
    localStorage.removeItem(KEY_PREFIX + matchId);
  } catch {
    // Nada que borrar.
  }
}
