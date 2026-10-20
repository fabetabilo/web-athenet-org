import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { bffDirectorUrl, withBffToken, type DirectorEvent, type EventWrite } from './bff';

/**
 * CRUD de eventos en el BFF (`/api/director/events`), direccionado por `internalId`.
 * POST, PUT y DELETE aún están pendientes en el BFF.
 */
@Injectable({ providedIn: 'root' })
export class DirectorApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly eventsUrl = `${bffDirectorUrl()}/events`;

  getEvents(): Observable<DirectorEvent[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<DirectorEvent[]>(this.eventsUrl, { headers }),
    );
  }

  getEventByInternalId(internalId: string): Observable<DirectorEvent> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<DirectorEvent>(this.eventUrl(internalId), { headers }),
    );
  }

  createEvent(payload: EventWrite): Observable<DirectorEvent> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<DirectorEvent>(this.eventsUrl, payload, { headers }),
    );
  }

  updateEvent(internalId: string, payload: EventWrite): Observable<DirectorEvent> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<DirectorEvent>(this.eventUrl(internalId), payload, { headers }),
    );
  }

  deleteEvent(internalId: string): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(this.eventUrl(internalId), { headers }),
    );
  }

  private eventUrl(internalId: string): string {
    return `${this.eventsUrl}/${encodeURIComponent(internalId)}`;
  }
}
