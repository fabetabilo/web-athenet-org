import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, delay, switchMap, catchError } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

export interface AthenetEvent {
  internalId: string;
  id?: number | string;
  title: string;
  category: string;
  eventDate: string;
  status: 'PUBLISHED' | 'DRAFT' | 'CANCELLED';
  isOfficial: boolean;
  location: string;
  // Descripción breve
  description?: string;
  // Descripción extendida (TEXT en BD)
  descriptionOpt?: string;
  address?: string;
  coverImage?: string;
  // Lista de URLs de fotos adicionales
  photos?: string[];
  type?: string;
  organizationId?: number | null;
  teamOneId?: number | null;
  teamTwoId?: number | null;
}

/**
 * Normaliza cualquier formato recibido del backend (camelCase o snake_case)
 * garantizando una estructura limpia y fuertemente tipada en el frontend.
 */
export function normalizeAthenetEvent(raw: any): AthenetEvent {
  if (!raw || typeof raw !== 'object') {
    return {
      internalId: '',
      title: '',
      category: '',
      eventDate: '',
      status: 'DRAFT',
      isOfficial: false,
      location: '',
    };
  }

  return {
    internalId: String(raw.internalId ?? raw.internal_id ?? raw.id ?? ''),
    id: raw.id ?? raw.internalId ?? raw.internal_id,
    title: String(raw.title ?? ''),
    category: String(raw.category ?? ''),
    eventDate: String(raw.eventDate ?? raw.event_date ?? ''),
    status: (raw.status ?? 'DRAFT') as 'PUBLISHED' | 'DRAFT' | 'CANCELLED',
    isOfficial: Boolean(raw.isOfficial ?? raw.is_official_flag ?? false),
    location: String(raw.location ?? ''),
    description: raw.description,
    descriptionOpt: raw.description_opt ?? raw.descriptionOpt,
    address: raw.address,
    coverImage: raw.coverImage ?? raw.cover_image,
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    type: raw.type,
    organizationId: raw.organizationId ?? raw.organization_id ?? null,
    teamOneId: raw.teamOneId ?? raw.team_one_id ?? null,
    teamTwoId: raw.teamTwoId ?? raw.team_two_id ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class DirectorApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(MsalService, { optional: true });
  private readonly eventsApiUrl = (environment.eventsApiUrl ?? 'http://localhost:8080').replace(/\/+$/, '');

  getEventsApiUrl(): string {
    return this.eventsApiUrl;
  }

  /**
   * Obtiene todos los eventos públicos institucionales desde el backend.
   * Endpoint: GET /api/public/events
   */
  getEvents(): Observable<AthenetEvent[]> {
    return this.http
      .get<any[]>(`${this.eventsApiUrl}/api/public/events`)
      .pipe(
        delay(7000), // <---- jejejeje
        map((response) => {
          // Soporte para array plano o respuesta envuelta (data / content)
          const items = Array.isArray(response)
            ? response
            : Array.isArray((response as any)?.content)
              ? (response as any).content
              : Array.isArray((response as any)?.data)
                ? (response as any).data
                : [];

          return items.map(normalizeAthenetEvent);
        }),
      );
  }

  /**
   * Elimina un evento institucional en el backend.
   * Endpoint protegido: DELETE /api/admin/events/{id}
   * Si MSAL está configurado, adquiere silenciosamente el ID Token y lo envía como Bearer.
   */
  deleteEvent(id: string | number): Observable<void> {
    const account =
      this.authService?.instance.getActiveAccount() ??
      this.authService?.instance.getAllAccounts()[0];

    if (this.authService && account) {
      if (!this.authService.instance.getActiveAccount()) {
        this.authService.instance.setActiveAccount(account);
      }

      return this.authService.acquireTokenSilent({ ...loginRequest, account }).pipe(
        catchError(() =>
          this.authService!.acquireTokenPopup(loginRequest),
        ),
        switchMap((tokenResult) => {
          const headers = new HttpHeaders({
            Authorization: `Bearer ${tokenResult.idToken}`,
          });
          return this.http.delete<void>(`${this.eventsApiUrl}/api/admin/events/${id}`, { headers });
        }),
      );
    }

    return this.http.delete<void>(`${this.eventsApiUrl}/api/admin/events/${id}`);
  }

  /**
   * Obtiene el detalle de un evento por su internalId.
   * Fuente primaria: Signal de la lista ya cargada en el componente.
   * Fallback (acceso directo por URL): GET /api/public/events/{internalId} — solo PUBLISHED.
   * Un endpoint admin por ID se añadirá a ms-events en una fase posterior
   * para cubrir DRAFT y CANCELLED con acceso directo por URL.
   */
  getEventByInternalId(internalId: string): Observable<AthenetEvent> {
    return this.http
      .get<any>(`${this.eventsApiUrl}/api/public/events/${internalId}`)
      .pipe(
        delay(2000),
        map(normalizeAthenetEvent));
  }

  /**
   * Crea un nuevo evento institucional.
   * Endpoint protegido: POST /api/admin/events
   * Devuelve el evento creado con su id e internalId asignados por el backend.
   */
  createEvent(payload: Partial<AthenetEvent>): Observable<AthenetEvent> {
    const account =
      this.authService?.instance.getActiveAccount() ??
      this.authService?.instance.getAllAccounts()[0];

    if (this.authService && account) {
      if (!this.authService.instance.getActiveAccount()) {
        this.authService.instance.setActiveAccount(account);
      }

      return this.authService.acquireTokenSilent({ ...loginRequest, account }).pipe(
        catchError(() =>
          this.authService!.acquireTokenPopup(loginRequest),
        ),
        switchMap((tokenResult) => {
          const headers = new HttpHeaders({
            Authorization: `Bearer ${tokenResult.idToken}`,
          });
          return this.http
            .post<any>(`${this.eventsApiUrl}/api/admin/events`, payload, { headers })
            .pipe(
              delay(2000),
              map(normalizeAthenetEvent));
        }),
      );
    }

    return this.http
      .post<any>(`${this.eventsApiUrl}/api/admin/events`, payload)
      .pipe(map(normalizeAthenetEvent));
  }

  /**
   * Actualiza un evento existente por su ID numérico de base de datos.
   * Endpoint protegido: PUT /api/admin/events/{id}
   */
  updateEvent(id: number | string, payload: Partial<AthenetEvent>): Observable<AthenetEvent> {
    const account =
      this.authService?.instance.getActiveAccount() ??
      this.authService?.instance.getAllAccounts()[0];

    if (this.authService && account) {
      if (!this.authService.instance.getActiveAccount()) {
        this.authService.instance.setActiveAccount(account);
      }

      return this.authService.acquireTokenSilent({ ...loginRequest, account }).pipe(
        catchError(() =>
          this.authService!.acquireTokenPopup(loginRequest),
        ),
        switchMap((tokenResult) => {
          const headers = new HttpHeaders({
            Authorization: `Bearer ${tokenResult.idToken}`,
          });
          return this.http
            .put<any>(`${this.eventsApiUrl}/api/admin/events/${id}`, payload, { headers })
            .pipe(
              delay(2000),
              map(normalizeAthenetEvent));
        }),
      );
    }

    return this.http
      .put<any>(`${this.eventsApiUrl}/api/admin/events/${id}`, payload)
      .pipe(map(normalizeAthenetEvent));
  }
}
