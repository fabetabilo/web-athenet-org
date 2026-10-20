import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import {
  bffDirectorUrl,
  withBffToken,
  type CompetitionTeam,
  type CompetitionWrite,
  type DirectorCompetition,
  type DirectorMatch,
  type MatchWrite,
} from './bff';

/** Copas del director en el BFF (`/api/director/competitions`): nómina y llave de partidos. */
/** separado por orden solamente. Pero nada quita que pueda ir en el mismo director-api-service */
@Injectable({ providedIn: 'root' })
export class DirectorCompetitionApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly competitionsUrl = `${bffDirectorUrl()}/competitions`;

  getCompetitions(): Observable<DirectorCompetition[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<DirectorCompetition[]>(this.competitionsUrl, { headers }),
    );
  }

  getCompetition(id: number): Observable<DirectorCompetition> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<DirectorCompetition>(this.competitionUrl(id), { headers }),
    );
  }

  createCompetition(payload: CompetitionWrite): Observable<DirectorCompetition> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<DirectorCompetition>(this.competitionsUrl, payload, { headers }),
    );
  }

  updateCompetition(id: number, payload: CompetitionWrite): Observable<DirectorCompetition> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<DirectorCompetition>(this.competitionUrl(id), payload, { headers }),
    );
  }

  deleteCompetition(id: number): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(this.competitionUrl(id), { headers }),
    );
  }

  startCompetition(id: number): Observable<DirectorCompetition> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<DirectorCompetition>(`${this.competitionUrl(id)}/start`, null, { headers }),
    );
  }

  getTeams(id: number): Observable<CompetitionTeam[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<CompetitionTeam[]>(`${this.competitionUrl(id)}/teams`, { headers }),
    );
  }

  enrollTeam(id: number, teamId: number): Observable<CompetitionTeam> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<CompetitionTeam>(`${this.competitionUrl(id)}/teams`, { teamId }, { headers }),
    );
  }

  removeTeam(id: number, teamId: number): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(`${this.competitionUrl(id)}/teams/${teamId}`, { headers }),
    );
  }

  getMatches(id: number): Observable<DirectorMatch[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<DirectorMatch[]>(`${this.competitionUrl(id)}/matches`, { headers }),
    );
  }

  updateMatch(id: number, matchId: number, payload: MatchWrite): Observable<DirectorMatch> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<DirectorMatch>(`${this.competitionUrl(id)}/matches/${matchId}`, payload, { headers }),
    );
  }

  /** Exige equipos, delegado, inicio y término posterior; es idempotente. */
  confirmMatch(id: number, matchId: number): Observable<DirectorMatch> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<DirectorMatch>(`${this.competitionUrl(id)}/matches/${matchId}/confirm`, null, { headers }),
    );
  }

  private competitionUrl(id: number): string {
    return `${this.competitionsUrl}/${id}`;
  }
}
