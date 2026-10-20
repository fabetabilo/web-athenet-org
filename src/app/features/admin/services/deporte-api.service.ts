import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { bffAdminUrl, withBffToken, type AdminSport, type AdminSportWrite } from './admin-bff';

/** Modelo de las vistas; el BFF lo entrega en inglés (`AdminSport`). */
export interface Deporte {
  id: number;
  nombre: string;
  descripcion: string | null;
}

/** Payload para crear/actualizar (sin id). */
export type DeporteInput = Omit<Deporte, 'id'>;

function toDeporte(dto: AdminSport): Deporte {
  return { id: dto.id, nombre: dto.name, descripcion: dto.description };
}

function toSportWrite(data: DeporteInput): AdminSportWrite {
  return { name: data.nombre, description: data.descripcion };
}

/** CRUD de deportes en el BFF (`/api/admin/sports`); todo exige el rol `admin`. */
@Injectable({ providedIn: 'root' })
export class DeporteApiService {
  private readonly http = inject(HttpClient);
  private readonly msal = inject(MsalService, { optional: true });
  private readonly baseUrl = `${bffAdminUrl()}/sports`;

  getDeportes(): Observable<Deporte[]> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminSport[]>(this.baseUrl, { headers }),
    ).pipe(map((list) => list.map(toDeporte)));
  }

  getDeporte(id: number): Observable<Deporte> {
    return withBffToken(this.msal, (headers) =>
      this.http.get<AdminSport>(`${this.baseUrl}/${id}`, { headers }),
    ).pipe(map(toDeporte));
  }

  crearDeporte(data: DeporteInput): Observable<Deporte> {
    return withBffToken(this.msal, (headers) =>
      this.http.post<AdminSport>(this.baseUrl, toSportWrite(data), { headers }),
    ).pipe(map(toDeporte));
  }

  actualizarDeporte(id: number, data: DeporteInput): Observable<Deporte> {
    return withBffToken(this.msal, (headers) =>
      this.http.put<AdminSport>(`${this.baseUrl}/${id}`, toSportWrite(data), { headers }),
    ).pipe(map(toDeporte));
  }

  eliminarDeporte(id: number): Observable<void> {
    return withBffToken(this.msal, (headers) =>
      this.http.delete<void>(`${this.baseUrl}/${id}`, { headers }),
    );
  }
}
