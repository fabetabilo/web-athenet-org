import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import {
  bffAdminUrl,
  withBffToken,
  type AdminInstitution,
  type AdminInstitutionWrite,
} from './admin-bff';

/** Modelo de las vistas; el BFF lo entrega en inglés (`AdminInstitution`). */
export interface Institucion {
  id: number;
  nombre: string;
  sigla: string | null;
  imagenUrl: string | null;
  activo: boolean;
}

/** Payload para crear/actualizar (sin id, que lo genera el backend) */
export type InstitucionInput = Omit<Institucion, 'id'>;

function toInstitucion(dto: AdminInstitution): Institucion {
  return {
    id: dto.id,
    nombre: dto.name,
    sigla: dto.acronym,
    imagenUrl: dto.imageUrl,
    activo: dto.active,
  };
}

function toInstitutionWrite(data: InstitucionInput): AdminInstitutionWrite {
  return {
    name: data.nombre,
    acronym: data.sigla,
    imageUrl: data.imagenUrl,
    active: data.activo,
  };
}

/**
 * CRUD de instituciones en el BFF (`/api/admin/institutions`); todo exige el
 * rol `admin`. El listado incluye las inactivas.
 */
@Injectable({ providedIn: 'root' })
export class InstitucionApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly baseUrl = `${bffAdminUrl()}/institutions`;

  getInstituciones(): Observable<Institucion[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminInstitution[]>(this.baseUrl, { headers }),
    ).pipe(map((list) => list.map(toInstitucion)));
  }

  getInstitucion(id: number): Observable<Institucion> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminInstitution>(`${this.baseUrl}/${id}`, { headers }),
    ).pipe(map(toInstitucion));
  }

  crearInstitucion(data: InstitucionInput): Observable<Institucion> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<AdminInstitution>(this.baseUrl, toInstitutionWrite(data), { headers }),
    ).pipe(map(toInstitucion));
  }

  actualizarInstitucion(id: number, data: InstitucionInput): Observable<Institucion> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<AdminInstitution>(`${this.baseUrl}/${id}`, toInstitutionWrite(data), { headers }),
    ).pipe(map(toInstitucion));
  }

  eliminarInstitucion(id: number): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(`${this.baseUrl}/${id}`, { headers }),
    );
  }
}
