import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { bffAdminUrl, withBffToken, type AdminTeam, type AdminTeamWrite } from './admin-bff';

export type Categoria = 'MASCULINO' | 'FEMENINO' | 'MIXTO';

/** Modelo de las vistas; el BFF lo entrega en inglés (`AdminTeam`). */
export interface Equipo {
  id: number;
  nombre: string;
  categoria: Categoria;
  entrenador: string | null;
  logoUrl: string | null;
  sedeId: number;
  sedeNombre: string;
  deporteId: number;
  deporteNombre: string;
  activo: boolean;
}

/**
 * Payload para crear/actualizar. sedeNombre/deporteNombre/activo no se
 * mandan (los resuelve o gestiona el backend).
 */
export type EquipoInput = Omit<Equipo, 'id' | 'sedeNombre' | 'deporteNombre' | 'activo'>;

function toEquipo(dto: AdminTeam): Equipo {
  return {
    id: dto.id,
    nombre: dto.name,
    categoria: dto.division as Categoria,
    entrenador: dto.coach,
    logoUrl: dto.logoUrl,
    sedeId: dto.campusId,
    sedeNombre: dto.campusName,
    deporteId: dto.sportId,
    deporteNombre: dto.sportName,
    activo: dto.active,
  };
}

function toTeamWrite(data: EquipoInput): AdminTeamWrite {
  return {
    name: data.nombre,
    division: data.categoria,
    coach: data.entrenador,
    logoUrl: data.logoUrl,
    campusId: data.sedeId,
    sportId: data.deporteId,
  };
}

/** CRUD de equipos en el BFF (`/api/admin/teams`); todo exige el rol `admin`. */
@Injectable({ providedIn: 'root' })
export class EquipoApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly baseUrl = `${bffAdminUrl()}/teams`;

  /** Si se pasa sedeId, filtra por esa sede (`?campusId=` en el BFF). */
  getEquipos(sedeId?: number): Observable<Equipo[]> {
    let params = new HttpParams();
    if (sedeId != null) {
      params = params.set('campusId', sedeId);
    }
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminTeam[]>(this.baseUrl, { headers, params }),
    ).pipe(map((list) => list.map(toEquipo)));
  }

  getEquipo(id: number): Observable<Equipo> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminTeam>(`${this.baseUrl}/${id}`, { headers }),
    ).pipe(map(toEquipo));
  }

  crearEquipo(data: EquipoInput): Observable<Equipo> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<AdminTeam>(this.baseUrl, toTeamWrite(data), { headers }),
    ).pipe(map(toEquipo));
  }

  actualizarEquipo(id: number, data: EquipoInput): Observable<Equipo> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<AdminTeam>(`${this.baseUrl}/${id}`, toTeamWrite(data), { headers }),
    ).pipe(map(toEquipo));
  }

  eliminarEquipo(id: number): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(`${this.baseUrl}/${id}`, { headers }),
    );
  }
}
