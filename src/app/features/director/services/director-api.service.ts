import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { bffBaseUrl, withBffToken, type EventRead, type EventWrite } from './bff';

/** CRUD de eventos en el BFF, direccionado por `internalId`. */
@Injectable({ providedIn: 'root' })
export class DirectorApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly eventsUrl = `${bffBaseUrl()}/events`;

  getEvents(): Observable<EventRead[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<EventRead[]>(this.eventsUrl, { headers }),
    );
  }

  getEventByInternalId(internalId: string): Observable<EventRead> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<EventRead>(this.eventUrl(internalId), { headers }),
    );
  }

  createEvent(payload: EventWrite): Observable<EventRead> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<EventRead>(this.eventsUrl, payload, { headers }),
    );
  }

  updateEvent(internalId: string, payload: EventWrite): Observable<EventRead> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<EventRead>(this.eventUrl(internalId), payload, { headers }),
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
