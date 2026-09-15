import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../../environments/environment';
import { loginRequest } from '../../../../auth/loginRequest';

/**
 * Coincide con InstitucionResponse del backend (record de Java, así que
 * Jackson lo serializa tal cual, sin camelCase/snake_case a normalizar).
 */
export interface Institucion {
  id: number;
  nombre: string;
  sigla: string | null;
  imagenUrl: string | null;
  activo: boolean;
}

/** Payload para crear/actualizar (sin id, que lo genera el backend) */
export type InstitucionInput = Omit<Institucion, 'id' | 'activo'>;

@Injectable({ providedIn: 'root' })
export class InstitucionApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(MsalService, { optional: true });
  private readonly baseUrl = (environment.apiUrl ?? 'http://localhost:8080').replace(/\/+$/, '');

  /**
   * GET /api/v1/instituciones — pública según el SecurityConfig del
   * microservicio (los GET a /api/v1/** son permitAll), así que no
   * necesita token.
   */
  getInstituciones(): Observable<Institucion[]> {
    return this.http.get<Institucion[]>(`${this.baseUrl}/api/v1/instituciones`);
  }

  getInstitucion(id: number): Observable<Institucion> {
    return this.http.get<Institucion>(`${this.baseUrl}/api/v1/instituciones/${id}`);
  }

  /**
   * POST /api/v1/instituciones — protegida, exige rol `admin`.
   */
  crearInstitucion(data: InstitucionInput): Observable<Institucion> {
    return this.conToken((headers) =>
      this.http.post<Institucion>(`${this.baseUrl}/api/v1/instituciones`, data, { headers }),
    );
  }

  actualizarInstitucion(id: number, data: InstitucionInput): Observable<Institucion> {
    return this.conToken((headers) =>
      this.http.put<Institucion>(`${this.baseUrl}/api/v1/instituciones/${id}`, data, { headers }),
    );
  }

  eliminarInstitucion(id: number): Observable<void> {
    return this.conToken((headers) =>
      this.http.delete<void>(`${this.baseUrl}/api/v1/instituciones/${id}`, { headers }),
    );
  }

  /**
   * Helper compartido: adquiere el ID Token silenciosamente (mismo patrón
   * que DirectorApiService.deleteEvent) y lo inyecta como Bearer antes de
   * ejecutar la request protegida que le pases.
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
