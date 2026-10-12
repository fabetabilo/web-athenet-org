import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import {
  bffBaseUrl,
  withBffToken,
  type Campus,
  type DelegateRef,
  type Division,
  type EventType,
  type Institution,
  type Sport,
  type Team,
} from './bff';

type QueryValue = string | number | null | undefined;

/**
 * Catálogos del formulario de evento. Se provee en `EventDetailComponent`, así
 * la caché dura lo que dura el formulario y la comparten sus `app-team-picker`.
 */
@Injectable()
export class EventCatalogService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly baseUrl = bffBaseUrl();
  private readonly cache = new Map<string, Observable<unknown[]>>();

  getSports(): Observable<Sport[]> {
    return this.cached<Sport>('/sports');
  }

  getEventTypes(): Observable<EventType[]> {
    return this.cached<EventType>('/event-types');
  }

  /** Solo usuarios con el rol `delegate`, ya filtrados por el BFF. */
  getDelegates(): Observable<DelegateRef[]> {
    return this.cached<DelegateRef>('/delegates');
  }

  /** Con `sportId`, solo las que tienen equipos de ese deporte. */
  getInstitutions(sportId?: number | null): Observable<Institution[]> {
    return this.cached<Institution>('/institutions', { sportId });
  }

  getCampuses(institutionId: number, sportId?: number | null): Observable<Campus[]> {
    return this.cached<Campus>(`/institutions/${institutionId}/campuses`, { sportId });
  }

  getTeams(campusId: number, sportId?: number | null, division?: Division | null): Observable<Team[]> {
    return this.cached<Team>(`/campuses/${campusId}/teams`, { sportId, division });
  }

  /** GET cacheado por ruta + parámetros; si falla, se descarta para reintentar. */
  private cached<T>(path: string, query: Record<string, QueryValue> = {}): Observable<T[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        params = params.set(key, value);
      }
    }

    const key = `${path}?${params.toString()}`;
    const hit = this.cache.get(key);
    if (hit) return hit as Observable<T[]>;

    const request$ = withBffToken(this.msal, (headers) =>
      this.http.get<T[]>(`${this.baseUrl}${path}`, { headers, params }),
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
