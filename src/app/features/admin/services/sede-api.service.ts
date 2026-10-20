import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { bffAdminUrl, withBffToken, type AdminCampus, type AdminCampusWrite } from './admin-bff';

/**
 * Modelo de las vistas; el BFF lo entrega en inglés (`AdminCampus`).
 * institucionNombre viene resuelto para no tener que pedir la institución aparte.
 */
export interface Sede {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  institucionId: number;
  institucionNombre: string;
}

/**
 * Payload para crear/actualizar. institucionNombre no se manda (lo resuelve
 * el backend a partir de institucionId).
 */
export type SedeInput = Omit<Sede, 'id' | 'institucionNombre'>;

function toSede(dto: AdminCampus): Sede {
  return {
    id: dto.id,
    nombre: dto.name,
    ciudad: dto.city,
    direccion: dto.address,
    institucionId: dto.institutionId,
    institucionNombre: dto.institutionName,
  };
}

function toCampusWrite(data: SedeInput): AdminCampusWrite {
  return {
    name: data.nombre,
    city: data.ciudad,
    address: data.direccion,
    institutionId: data.institucionId,
  };
}

/** CRUD de sedes en el BFF (`/api/admin/campuses`); todo exige el rol `admin`. */
@Injectable({ providedIn: 'root' })
export class SedeApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly baseUrl = `${bffAdminUrl()}/campuses`;

  /** Si se pasa institucionId, filtra por esa institución (`?institutionId=` en el BFF). */
  getSedes(institucionId?: number): Observable<Sede[]> {
    let params = new HttpParams();
    if (institucionId != null) {
      params = params.set('institutionId', institucionId);
    }
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminCampus[]>(this.baseUrl, { headers, params }),
    ).pipe(map((list) => list.map(toSede)));
  }

  getSede(id: number): Observable<Sede> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminCampus>(`${this.baseUrl}/${id}`, { headers }),
    ).pipe(map(toSede));
  }

  crearSede(data: SedeInput): Observable<Sede> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<AdminCampus>(this.baseUrl, toCampusWrite(data), { headers }),
    ).pipe(map(toSede));
  }

  actualizarSede(id: number, data: SedeInput): Observable<Sede> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<AdminCampus>(`${this.baseUrl}/${id}`, toCampusWrite(data), { headers }),
    ).pipe(map(toSede));
  }

  eliminarSede(id: number): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(`${this.baseUrl}/${id}`, { headers }),
    );
  }
}
