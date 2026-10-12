import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import type { MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

function bffUrl(): string {
  return environment.bffUrl.replace(/\/+$/, '');
}

/** `{bffUrl}/api/director`: exige el rol director. */
export function bffDirectorUrl(): string {
  return `${bffUrl()}/api/director`;
}

/** `{bffUrl}/api/common`: cualquier usuario logueado. */
export function bffCommonUrl(): string {
  return `${bffUrl()}/api/common`;
}

/**
 * Ejecuta `request` con el access token de la API (no el idToken). Abre el
 * popup solo si MSAL exige interacción; sin sesión, falla sin pedir nada.
 * Si el BFF responde `401`, renueva el token una vez y reintenta.
 */
export function withBffToken<T>(
  msal: MsalService | null,
  request: (headers: HttpHeaders) => Observable<T>,
): Observable<T> {
  const account = msal?.instance.getActiveAccount() ?? msal?.instance.getAllAccounts()[0];
  if (!msal || !account) {
    return throwError(() => new Error('No hay una sesión activa para consultar el BFF.'));
  }

  if (!msal.instance.getActiveAccount()) {
    msal.instance.setActiveAccount(account);
  }

  const send = (forceRefresh: boolean) =>
    msal.acquireTokenSilent({ ...loginRequest, account, forceRefresh }).pipe(
      catchError((err: unknown) =>
        err instanceof InteractionRequiredAuthError
          ? msal.acquireTokenPopup(loginRequest)
          : throwError(() => err),
      ),
      switchMap((tokenResult) =>
        request(new HttpHeaders({ Authorization: `Bearer ${tokenResult.accessToken}` })),
      ),
    );

  return send(false).pipe(
    catchError((err: unknown) =>
      err instanceof HttpErrorResponse && err.status === 401 ? send(true) : throwError(() => err),
    ),
  );
}

/**
 * Mensaje para la persona según el código HTTP del BFF. `401` y `403` no traen
 * body; el resto usa `fallback` salvo que el BFF mande un `ApiError`.
 */
export function bffErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  switch (err.status) {
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403:
      return 'No tienes permisos para gestionar eventos.';
    case 404:
      return 'Evento no encontrado.';
    case 503:
      return 'El servicio de eventos no está disponible por ahora. Intenta nuevamente en unos minutos.';
    default:
      return isApiError(err.error) ? err.error.message : fallback;
  }
}

/** `503` o sin respuesta: tiene sentido ofrecer reintentar. */
export function isRetryableBffError(err: unknown): boolean {
  return err instanceof HttpErrorResponse && (err.status === 503 || err.status === 0);
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiError).code === 'string' &&
    typeof (body as ApiError).message === 'string'
  );
}

export type EventTypeCode = 'MATCH' | 'MEETING' | 'TRACKDAY' | 'OTHER';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

// Dropdowns: arrays planos ordenados por `name`.
export interface EventTypeOption {
  code: EventTypeCode;
  label: string;
  /** `true`: lleva enfrentamiento en vez de organizador. */
  requiresMatchup: boolean;
}
export interface SportOption { id: number; name: string; }
export interface InstitutionOption { id: number; name: string; acronym: string; }
export interface CampusOption { id: number; name: string; }
export interface TeamOption { id: number; name: string; division: string; }

// Lectura de eventos: `name` viene en `null` si la referencia ya no existe.
export interface SportRef { id: number; name: string | null; }
export interface InstitutionRef { id: number; name: string | null; acronym: string | null; }
export interface CampusRef { id: number; name: string | null; }
export interface TeamRef { id: number; name: string | null; division: string | null; }
export interface MatchTeam extends TeamRef { campus: CampusRef | null; institution: InstitutionRef | null; }
export interface Organizer { institution: InstitutionRef | null; campus: CampusRef | null; team: TeamRef | null; }

/** Usuario con el rol `delegate`; el dropdown se arma desde Graph, no desde el BFF. */
export interface Delegate {
  /** oid de Entra ID; se guarda como `delegateOid`. */
  oid: string;
  displayName: string;
}

/** Evento leído del BFF; se identifica solo por `internalId`. */
export interface DirectorEvent {
  internalId: string;
  title: string;
  description: string;
  descriptionOpt: string | null;
  type: EventTypeCode;
  status: EventStatus;
  isOfficial: boolean;
  /** `yyyy-MM-dd` */
  eventDate: string;
  /** `HH:mm` */
  startTime: string;
  /** `yyyy-MM-dd` */
  endDate: string;
  /** `HH:mm` */
  endTime: string;
  location: string | null;
  address: string | null;
  coverImage: string;
  photos: string[];
  sport: SportRef | null;
  /** Solo en eventos que no son partido. */
  organizer: Organizer | null;
  /** Solo en partidos. */
  teamOne: MatchTeam | null;
  /** Solo en partidos. */
  teamTwo: MatchTeam | null;
  delegate: Delegate | null;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  /** `field` es el nombre exacto de la clave del body. */
  fieldErrors: { field: string; code: string; message: string }[];
}

/** Body plano de POST/PUT (pendientes en el BFF): solo IDs. */
export interface EventWrite {
  internalId: string;
  title: string;
  description: string;
  descriptionOpt: string | null;
  type: string;
  status: EventStatus;
  isOfficial: boolean;
  eventDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string | null;
  address: string | null;
  coverImage: string;
  photos: string[];
  sportId: number | null;
  organizerInstitutionId: number | null;
  organizerCampusId: number | null;
  organizerTeamId: number | null;
  teamOneInstitutionId: number | null;
  teamOneCampusId: number | null;
  teamOneId: number | null;
  teamTwoInstitutionId: number | null;
  teamTwoCampusId: number | null;
  teamTwoId: number | null;
  delegateOid: string | null;
  delegateDisplayName: string | null;
}
