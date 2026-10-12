import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { UserApiService } from '../../admin/services/user-api.service';
import type { Delegate } from './bff';

/**
 * ⚠️  TEMPORAL — SOLO PARA DESARROLLO. NO DEBE LLEGAR A PRODUCCIÓN.  ⚠️
 *
 * Según el contrato con el BFF, el dropdown de delegados no pasa por el BFF y
 * se sigue armando desde Microsoft Graph. Este servicio lo hace mientras tanto.
 *
 * Problema de seguridad: reutiliza la lectura de Graph de admin
 * (`UserApiService.getDirectory`) con el token DELEGADO del director. Ese token
 * puede leer TODO el directorio y TODAS las asignaciones de rol (admins y
 * directores incluidos), y la respuesta completa llega al navegador. El filtro
 * por rol de abajo es solo cosmético, no un control de acceso. Viola el
 * requisito de que el director no pueda ver a admins ni directores.
 *
 * Reemplazo definitivo: el BFF consulta Graph con permisos de APLICACIÓN
 * (client credentials), filtra el rol `delegate` en el servidor y devuelve solo
 * `{ oid, displayName }`. Hay que evaluar con el equipo del BFF esa llamada
 * directa a Graph.
 *
 * Para retirarlo: borrar este archivo y su spec, y en `EventDetailComponent`
 * cambiar `devDelegates.getDelegates()` por el endpoint que se acuerde.
 */
@Injectable({ providedIn: 'root' })
export class DevDelegatesService {
  private readonly userApi = inject(UserApiService);

  getDelegates(): Observable<Delegate[]> {
    return this.userApi.getDirectory().pipe(
      map(({ users }) =>
        users
          .filter((user) => user.accountEnabled && user.roles.includes('delegate'))
          .map((user) => ({ oid: user.id, displayName: user.displayName }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
      ),
    );
  }
}
