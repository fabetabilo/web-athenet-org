import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AthenetEvent {
  internalId: string;
  title: string;
  category: string;
  eventDate: string;
  status: 'PUBLISHED' | 'DRAFT' | 'CANCELLED';
  isOfficial: boolean;
  location: string;
  description?: string;
  address?: string;
  coverImage?: string;
  type?: string;
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
    internalId: String(raw.internalId ?? raw.internal_id ?? ''),
    title: String(raw.title ?? ''),
    category: String(raw.category ?? ''),
    eventDate: String(raw.eventDate ?? raw.event_date ?? ''),
    status: (raw.status ?? 'DRAFT') as 'PUBLISHED' | 'DRAFT' | 'CANCELLED',
    isOfficial: Boolean(raw.isOfficial ?? raw.is_official_flag ?? false),
    location: String(raw.location ?? ''),
    description: raw.description ?? raw.description_opt,
    address: raw.address,
    coverImage: raw.coverImage ?? raw.cover_image,
    type: raw.type,
  };
}

@Injectable({ providedIn: 'root' })
export class DirectorApiService {
  private readonly http = inject(HttpClient);
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
}
