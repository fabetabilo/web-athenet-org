import type { PillVariant } from '../../../shared/components/pill/pill';
import type { CompetitionStatus, DirectorMatch, MatchStatus } from '../services/bff';

interface StatusStyle { label: string; variant: PillVariant; }

// `Record<string>`: las celdas de `app-table` reciben la fila como `any`.
export const COMPETITION_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: 'Borrador', variant: 'warning' },
  IN_PROGRESS: { label: 'En curso', variant: 'info' },
  FINISHED: { label: 'Finalizada', variant: 'success' },
} satisfies Record<CompetitionStatus, StatusStyle>;

export const COMPETITION_STATUS_OPTIONS = Object.entries(COMPETITION_STATUS).map(([value, { label }]) => ({
  label,
  value,
}));

export const MATCH_STATUS: Record<string, StatusStyle> = {
  SCHEDULED: { label: 'Programado', variant: 'neutral' },
  IN_PROGRESS: { label: 'En juego', variant: 'info' },
  FINISHED: { label: 'Finalizado', variant: 'success' },
} satisfies Record<MatchStatus, StatusStyle>;

export const CUP_SIZE = 16;

/** Lo que le falta al partido para que el delegado pueda iniciarlo. */
export function missingMatchData(match: DirectorMatch): string[] {
  const missing: string[] = [];
  if (!match.homeTeam || !match.awayTeam) missing.push('equipos');
  if (!match.date) missing.push('fecha');
  if (!match.time) missing.push('hora');
  if (!match.delegate) missing.push('delegado');
  return missing;
}
