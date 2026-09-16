import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

/** Coincide con DeporteResponse del backend. */
export interface Deporte {
  id: number;
  nombre: string;
  descripcion: string | null;
}

/** Payload para crear/actualizar (sin id). */
export type DeporteInput = Omit<Deporte, 'id'>;

@Injectable({ providedIn: 'root' })
export class DeporteApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(MsalService, { optional: true });
  private readonly baseUrl = (environment.apiUrl ?? 'http://localhost:8080').replace(/\/+$/, '');

  /** GET /api/v1/deportes — pública. */
  getDeportes(): Observable<Deporte[]> {
    return this.http.get<Deporte[]>(`${this.baseUrl}/api/v1/deportes`);
  }

  getDeporte(id: number): Observable<Deporte> {
    return this.http.get<Deporte>(`${this.baseUrl}/api/v1/deportes/${id}`);
  }

  /** POST /api/v1/deportes — protegida, exige rol `admin`. */
  crearDeporte(data: DeporteInput): Observable<Deporte> {
    return this.conToken((headers) =>
      this.http.post<Deporte>(`${this.baseUrl}/api/v1/deportes`, data, { headers }),
    );
  }

  actualizarDeporte(id: number, data: DeporteInput): Observable<Deporte> {
    return this.conToken((headers) =>
      this.http.put<Deporte>(`${this.baseUrl}/api/v1/deportes/${id}`, data, { headers }),
    );
  }

  eliminarDeporte(id: number): Observable<void> {
    return this.conToken((headers) =>
      this.http.delete<void>(`${this.baseUrl}/api/v1/deportes/${id}`, { headers }),
    );
  }

  /** Helper compartido: mismo patrón que InstitucionApiService/SedeApiService.conToken(). */
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
