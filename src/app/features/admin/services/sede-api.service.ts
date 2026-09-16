import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

/**
 * Coincide con SedeResponse del backend (record de Java). institucionNombre
 * viene resuelto por el backend para no tener que pedir la institución aparte.
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

@Injectable({ providedIn: 'root' })
export class SedeApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(MsalService, { optional: true });
  private readonly baseUrl = (environment.apiUrl ?? 'http://localhost:8080').replace(/\/+$/, '');

  /**
   * GET /api/v1/sedes — pública. Si se pasa institucionId, filtra por esa
   * institución (usa el mismo endpoint con query param, como hace el backend).
   */
  getSedes(institucionId?: number): Observable<Sede[]> {
    let params = new HttpParams();
    if (institucionId != null) {
      params = params.set('institucionId', institucionId);
    }
    return this.http.get<Sede[]>(`${this.baseUrl}/api/v1/sedes`, { params });
  }

  getSede(id: number): Observable<Sede> {
    return this.http.get<Sede>(`${this.baseUrl}/api/v1/sedes/${id}`);
  }

  /**
   * POST /api/v1/sedes — protegida, exige rol `admin`.
   */
  crearSede(data: SedeInput): Observable<Sede> {
    return this.conToken((headers) =>
      this.http.post<Sede>(`${this.baseUrl}/api/v1/sedes`, data, { headers }),
    );
  }

  actualizarSede(id: number, data: SedeInput): Observable<Sede> {
    return this.conToken((headers) =>
      this.http.put<Sede>(`${this.baseUrl}/api/v1/sedes/${id}`, data, { headers }),
    );
  }

  eliminarSede(id: number): Observable<void> {
    return this.conToken((headers) =>
      this.http.delete<void>(`${this.baseUrl}/api/v1/sedes/${id}`, { headers }),
    );
  }

  /**
   * Helper compartido: mismo patrón que InstitucionApiService.conToken().
   */
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
