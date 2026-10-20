import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { bffErrorMessage } from '../../director/services/bff';

/** `{bffUrl}/api/delegate`: exige el rol delegate. */
export function bffDelegateUrl(): string {
  return `${environment.bffUrl.replace(/\/+$/, '')}/api/delegate`;
}

export type MatchRound = 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED';

export interface MatchTeamRef { id: number; name: string | null; logoUrl: string | null; }

/** Partido de "Mis eventos": solo los que tiene asignados el delegado del token. */
export interface DelegateMatch {
  id: number;
  competition: { id: number; name: string | null; competitionImg: string | null };
  round: MatchRound;
  /** "Octavos de final", "Cuartos de final", "Semifinal", "Final" */
  roundLabel: string;
  /** `yyyy-MM-dd` */
  date: string | null;
  /** `HH:mm` */
  time: string | null;
  location: string | null;
  address: string | null;
  /** `null`: por definir. */
  homeTeam: MatchTeamRef | null;
  awayTeam: MatchTeamRef | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  /** ms-competitions rechaza el inicio hasta que el director confirma la programación. */
  scheduleConfirmed: boolean;
}

/** Resultado final o su corrección. No hay empates. */
export interface ResultWrite { homeScore: number; awayScore: number; }

/**
 * ms-competitions trae en `403` y `404` un `message` listo para mostrar, que
 * `bffErrorMessage` reemplaza por un texto de eventos. El `403` de seguridad
 * (usuario sin el rol) llega sin body.
 */
export function delegateErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const message = typeof err.error?.message === 'string' ? (err.error.message as string) : null;
    if (err.status === 403) return message ?? 'No tienes permisos para gestionar este partido.';
    if (err.status === 404) return message ?? 'Partido no encontrado.';
    if (err.status === 502) return fallback;
  }
  return bffErrorMessage(err, fallback);
}

/** Lo que le falta al partido para que ms-competitions acepte iniciarlo. */
export function missingToStart(match: DelegateMatch): string[] {
  const missing: string[] = [];
  if (!match.homeTeam || !match.awayTeam) missing.push('equipos');
  if (!match.date) missing.push('fecha');
  if (!match.time) missing.push('hora');
  if (!match.scheduleConfirmed) missing.push('confirmación del director');
  return missing;
}
