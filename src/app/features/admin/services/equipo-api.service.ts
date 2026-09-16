import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

export type Categoria = 'MASCULINO' | 'FEMENINO' | 'MIXTO';

/** Coincide con EquipoResponse del backend. */
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

@Injectable({ providedIn: 'root' })
export class EquipoApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(MsalService, { optional: true });
  private readonly baseUrl = (environment.apiUrl ?? 'http://localhost:8080').replace(/\/+$/, '');

  /**
   * GET /api/v1/equipos — pública. Si se pasa sedeId, filtra por esa sede
   * (mismo endpoint con query param, como hace el backend).
   */
  getEquipos(sedeId?: number): Observable<Equipo[]> {
    let params = new HttpParams();
    if (sedeId != null) {
      params = params.set('sedeId', sedeId);
    }
    return this.http.get<Equipo[]>(`${this.baseUrl}/api/v1/equipos`, { params });
  }

  getEquipo(id: number): Observable<Equipo> {
    return this.http.get<Equipo>(`${this.baseUrl}/api/v1/equipos/${id}`);
  }

  /** POST /api/v1/equipos — protegida, exige rol `admin`. */
  crearEquipo(data: EquipoInput): Observable<Equipo> {
    return this.conToken((headers) =>
      this.http.post<Equipo>(`${this.baseUrl}/api/v1/equipos`, data, { headers }),
    );
  }

  actualizarEquipo(id: number, data: EquipoInput): Observable<Equipo> {
    return this.conToken((headers) =>
      this.http.put<Equipo>(`${this.baseUrl}/api/v1/equipos/${id}`, data, { headers }),
    );
  }

  eliminarEquipo(id: number): Observable<void> {
    return this.conToken((headers) =>
      this.http.delete<void>(`${this.baseUrl}/api/v1/equipos/${id}`, { headers }),
    );
  }

  /** Helper compartido: mismo patrón que los otros *ApiService.conToken(). */
  private conToken<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const account =
      this.authService?.instance.getActiveAccount() ??
      this.authService?.instance.getAllAccounts()[0];

    if (this.authService && account) {
      if (!this.authService.instance.getActiveAccount()) {
        this.authService.instance.setActiveAccount(account);
      }

      return this.authService.acquireTokenSilent({ ...loginRequest, account }).pipe(
        switchMap((tokenResult) => {
          const headers = new HttpHeaders({
            Authorization: `Bearer ${tokenResult.idToken}`,
          });
          return request(headers);
        }),
      );
    }

    return request(new HttpHeaders());
  }
}
