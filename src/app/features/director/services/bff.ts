import { HttpHeaders } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import type { MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

/** `{bffUrl}/api/v1` */
export function bffBaseUrl(): string {
  return `${environment.bffUrl.replace(/\/+$/, '')}/api/v1`;
}

/**
 * Ejecuta `request` con el access token de la API (no el idToken). Abre el
 * popup solo si MSAL exige interacción; sin sesión, falla sin pedir nada.
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

  return msal.acquireTokenSilent({ ...loginRequest, account }).pipe(
    catchError((err: unknown) =>
      err instanceof InteractionRequiredAuthError
        ? msal.acquireTokenPopup(loginRequest)
        : throwError(() => err),
    ),
    switchMap((tokenResult) =>
      request(new HttpHeaders({ Authorization: `Bearer ${tokenResult.accessToken}` })),
    ),
  );
}

export type EventStatus = 'PUBLISHED' | 'DRAFT' | 'CANCELLED';

/** `Equipo.categoria` de ms-institution. */
export type Division = 'MASCULINO' | 'FEMENINO' | 'MIXTO';

export interface Sport {
  id: number;
  /** `null` si el deporte fue eliminado. */
  name: string | null;
}

export interface EventType {
  code: string;
  label: string;
  /** `true`: lleva enfrentamiento en vez de organizador. */
  requiresMatchup: boolean;
}

export interface Institution {
  id: number;
  name: string | null;
  acronym?: string | null;
  logoUrl?: string | null;
}

export interface Campus {
  id: number;
  name: string | null;
  city?: string | null;
}

export interface Team {
  id: number;
  name: string | null;
  division?: Division | null;
  logoUrl?: string | null;
}

export interface TeamChain extends Team {
  campus: Campus;
  institution: Institution;
}

export interface Organizer {
  institution: Institution;
  campus: Campus;
  team: Team | null;
}

/** Usuario con el rol `delegate`; el BFF filtra el rol, el front nunca ve otros usuarios. */
export interface DelegateRef {
  /** oid de Entra ID; se guarda como `delegateOid`. */
  oid: string;
  displayName: string;
}

export interface EventRead {
  id?: number;
  internalId: string;
  title: string;
  description?: string | null;
  descriptionOpt?: string | null;
  type: string;
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
  location?: string | null;
  address?: string | null;
  coverImage?: string | null;
  photos?: string[];
  sport: Sport | null;
  organizer: Organizer | null;
  teamOne: TeamChain | null;
  teamTwo: TeamChain | null;
  delegate: DelegateRef | null;
}

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
