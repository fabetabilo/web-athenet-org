import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { withBffToken } from '../../director/services/bff';
import { bffDelegateUrl, type DelegateMatch, type ResultWrite } from './delegate-bff';

/** "Mis eventos" del delegado en el BFF (`/api/delegate/matches`). */
@Injectable({ providedIn: 'root' })
export class DelegateApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly matchesUrl = `${bffDelegateUrl()}/matches`;

  /** Ordenados por fecha y hora. */
  getMatches(): Observable<DelegateMatch[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<DelegateMatch[]>(this.matchesUrl, { headers }),
    );
  }

  /** El BFF no expone un partido suelto: se busca en la lista. `null` si no está asignado. */
  getMatch(id: number): Observable<DelegateMatch | null> {
    return this.getMatches().pipe(map((matches) => matches.find((m) => m.id === id) ?? null));
  }

  /** Puede iniciarse antes de la hora programada. */
  startMatch(id: number): Observable<DelegateMatch> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<DelegateMatch>(`${this.matchesUrl}/${id}/start`, null, { headers }),
    );
  }

  /** Finaliza el partido (el ganador avanza en la llave) o corrige su resultado. */
  registerResult(id: number, body: ResultWrite): Observable<DelegateMatch> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<DelegateMatch>(`${this.matchesUrl}/${id}/result`, body, { headers }),
    );
  }
}
