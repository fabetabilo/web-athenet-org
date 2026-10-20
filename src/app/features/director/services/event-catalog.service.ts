import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import {
  bffCommonUrl,
  bffDirectorUrl,
  withBffToken,
  type CampusOption,
  type EventTypeOption,
  type InstitutionOption,
  type SportOption,
  type TeamOption,
} from './bff';

type QueryValue = string | number | null | undefined;

/**
 * Catálogos del formulario de evento. Se provee en `EventDetailComponent`, así
 * la caché dura lo que dura el formulario y la comparten sus `app-team-picker`.
 *
 * Deportes, instituciones, sedes y equipos vienen de ms-institutions a través del
 * BFF, que ya oculta instituciones y equipos inactivos: no fijar IDs ni nombres en
 * el código. Los delegados no pasan por el BFF (ver `DevDelegatesService`).
 */
@Injectable()
export class EventCatalogService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly directorUrl = bffDirectorUrl();
  private readonly commonUrl = bffCommonUrl();
  private readonly cache = new Map<string, Observable<unknown[]>>();

  getEventTypes(): Observable<EventTypeOption[]> {
    return this.cached<EventTypeOption>(`${this.directorUrl}/event-types`);
  }

  getSports(): Observable<SportOption[]> {
    return this.cached<SportOption>(`${this.commonUrl}/sports`);
  }

  getInstitutions(): Observable<InstitutionOption[]> {
    return this.cached<InstitutionOption>(`${this.commonUrl}/institutions`);
  }

  getCampuses(institutionId: number): Observable<CampusOption[]> {
    return this.cached<CampusOption>(`${this.commonUrl}/institutions/${institutionId}/campuses`);
  }

  /** Único nivel de la cascada que se filtra por deporte (y por división, en partidos). */
  getTeams(campusId: number, sportId?: number | null, division?: string | null): Observable<TeamOption[]> {
    return this.cached<TeamOption>(`${this.commonUrl}/campuses/${campusId}/teams`, { sportId, division });
  }

  /** GET cacheado por URL + parámetros; si falla, se descarta para reintentar. */
  private cached<T>(url: string, query: Record<string, QueryValue> = {}): Observable<T[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        params = params.set(key, value);
      }
    }

    const key = `${url}?${params.toString()}`;
    const hit = this.cache.get(key);
    if (hit) return hit as Observable<T[]>;

    const request$ = withBffToken(this.msal, (headers) =>
      this.http.get<T[]>(url, { headers, params }),
    ).pipe(
      catchError((err: unknown) => {
        this.cache.delete(key);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cache.set(key, request$);
    return request$;
  }
}
