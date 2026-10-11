import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, throwError } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError, InteractionRequiredAuthErrorCodes, } from '@azure/msal-browser';
import { environment } from '../../../../environments/environment';
import { GRAPH_BASE_URL, graphRequest } from '../../../../auth/graphRequest';

/**
 * Código de un app role: el `value` del manifest, que es el string que viaja
 * en el claim `roles` del token y el que compara `RoleGuard`. Es `string` y no
 * una unión cerrada porque el catálogo se lee del service principal en tiempo
 * de ejecución: si mañana se agrega un rol al manifest, aparece solo.
 */
export type AppRoleCode = string;

export interface AthenetUser {
  /** oid de Entra ID: identificador inmutable del usuario en el tenant */
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string | null;
  accountEnabled: boolean;
  roles: AppRoleCode[];
}

/** Rol declarado en `appRoles[]` del manifest de la aplicación. */
export interface AppRole {
  code: AppRoleCode;
  displayName: string;
  description: string;
}

/** Lo que la vista necesita para renderizar */
export interface AthenetDirectory {
  users: AthenetUser[];
  roles: AppRole[];
}

const ROLE_ICONS: Record<string, string> = {
  admin: 'shield',
  director: 'event_note',
  delegate: 'sports',
};

export function roleIcon(code: AppRoleCode): string {
  return ROLE_ICONS[code] ?? 'badge';
}

/**
 * `appRoleId` que Entra ID usa cuando la asignación da acceso a la aplicación
 * sin un rol concreto. Que NO corresponde a ninguna entrada de `appRoles[]`.
 */
export const DEFAULT_APP_ROLE_ID = '00000000-0000-0000-0000-000000000000';


// --- Formas de respuesta de Microsoft Graph (contrato externo) ----------------------------

export interface GraphCollection<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

export interface GraphUser {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string | null;
  accountEnabled?: boolean;
}

export interface GraphAppRole {
  id: string;
  value: string | null;
  displayName?: string;
  description?: string;
  allowedMemberTypes?: string[];
  isEnabled?: boolean;
}

export interface GraphServicePrincipal {
  id: string;
  appRoles?: GraphAppRole[];
}

export interface GraphAppRoleAssignment {
  appRoleId: string;
  principalId: string;
  principalType?: string;
}

/**
 * Catálogo de roles asignables a personas: descarta los deshabilitados en el
 * manifest y los que solo admiten aplicaciones, que no tienen sentido en una
 * vista de usuarios.
 */
export function construirCatalogoDeRoles(appRoles: GraphAppRole[] | undefined): AppRole[] {
  return (appRoles ?? [])
    .filter(
      (rol) =>
        !!rol.value &&
        rol.isEnabled !== false &&
        (rol.allowedMemberTypes ?? ['User']).includes('User'),
    )
    .map((rol) => ({
      code: rol.value as string,
      displayName: rol.displayName ?? (rol.value as string),
      description: rol.description ?? '',
    }));
}

/**
 * Join en memoria de las tres respuestas de Graph. Las asignaciones vienen
 * como `(principalId, appRoleId)` y el catálogo como `(id, value)`, así que
 * aquí se traduce `appRoleId → value`: fuera de este servicio nadie ve un
 * appRoleId, que es detalle de infraestructura de Entra ID.
 */
export function resolverRolesPorUsuario(
  usuarios: GraphUser[] | undefined,
  appRoles: GraphAppRole[] | undefined,
  asignaciones: GraphAppRoleAssignment[] | undefined,
): AthenetUser[] {
  const valuePorAppRoleId = new Map(
    (appRoles ?? []).filter((rol) => !!rol.value).map((rol) => [rol.id, rol.value as string]),
  );

  const rolesPorPrincipal = new Map<string, AppRoleCode[]>();

  for (const asignacion of asignaciones ?? []) {
    // Solo personas: la misma colección trae grupos y service principals.
    if (asignacion.principalType !== 'User') continue;

    // Acceso a la app sin rol concreto: no es un rol que mostrar.
    if (!asignacion.appRoleId || asignacion.appRoleId === DEFAULT_APP_ROLE_ID) continue;

    // Asignación de un rol que ya no está declarado en el manifest.
    const code = valuePorAppRoleId.get(asignacion.appRoleId);
    if (!code) continue;

    const acumulados = rolesPorPrincipal.get(asignacion.principalId) ?? [];
    if (!acumulados.includes(code)) {
      acumulados.push(code);
    }
    rolesPorPrincipal.set(asignacion.principalId, acumulados);
  }

  return (usuarios ?? []).map((usuario) => ({
    id: usuario.id,
    displayName: usuario.displayName ?? usuario.userPrincipalName ?? '',
    userPrincipalName: usuario.userPrincipalName ?? '',
    mail: usuario.mail ?? null,
    accountEnabled: usuario.accountEnabled !== false,
    roles: rolesPorPrincipal.get(usuario.id) ?? [],
  }));
}

/**
 * Distingue "falta consentimiento del administrador" de "el servicio se cayó".
 * Son dos problemas distintos y el admin no puede hacer nada con el mensaje
 * equivocado: el primero se resuelve en el portal de Azure, no reintentando.
 *
 * Se manifiesta por dos vías: MSAL al pedir el token (`consent_required` / `interaction_required`) y Graph al rechazar la petición
 * (403 `Authorization_RequestDenied`).
 */
export function esErrorDeConsentimiento(err: unknown): boolean {
  if (err instanceof InteractionRequiredAuthError) {
    return true;
  }

  const errorCode = (err as { errorCode?: unknown })?.errorCode;
  if (
    errorCode === InteractionRequiredAuthErrorCodes.consentRequired ||
    errorCode === InteractionRequiredAuthErrorCodes.interactionRequired
  ) {
    return true;
  }

  if (err instanceof HttpErrorResponse && err.status === 403) {
    return err.error?.error?.code === 'Authorization_RequestDenied';
  }

  return false;
}

/**
 * Cliente de Microsoft Graph para la vista de usuarios.
 *
 * Lee el directorio con los scopes delegados del admin conectado (`graphRequest`), no con client credentials: 
 * no hay secreto en el navegador y Graph aplica sobre cada petición los permisos de la persona que la hace.
 * Por eso POR AHORA la vista es de solo lectura — ver `graphRequest.ts`.
 *
 * Las tres lecturas de Graph y el join entre ellas quedan encapsulados aquí: el componente recibe `AthenetUser[]` con los roles ya resueltos.
 */
@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(MsalService, { optional: true });
  private readonly graphUrl = GRAPH_BASE_URL;

  /** El service principal se direcciona por `appId` (el client id que ya está en el entorno), así no hay que hardcodear ni resolver un segundo GUID */
  private readonly servicePrincipalUrl = `${this.graphUrl}/servicePrincipals(appId='${environment.clientId}')`;

  getGraphApiUrl(): string {
    return this.graphUrl;
  }

  /**
   * Directorio del tenant con los roles de esta aplicación ya resueltos.
   *
   * Tres lecturas en paralelo con un único token:
   * - `/users` — las personas del tenant.
   * - `…/servicePrincipals(appId)` — el catálogo `appRoles[]` del manifest.
   * - `…/appRoleAssignedTo` — las asignaciones vigentes.
   */
  getDirectory(): Observable<AthenetDirectory> {
    return this.conTokenGraph((headers) =>
      forkJoin({
        usuarios: this.http.get<GraphCollection<GraphUser>>(
          `${this.graphUrl}/users?$select=id,displayName,userPrincipalName,mail,accountEnabled`,
          { headers },
        ),
        servicePrincipal: this.http.get<GraphServicePrincipal>(
          `${this.servicePrincipalUrl}?$select=id,appRoles`,
          { headers },
        ),
        asignaciones: this.http.get<GraphCollection<GraphAppRoleAssignment>>(
          `${this.servicePrincipalUrl}/appRoleAssignedTo`,
          { headers },
        ),
      }).pipe(
        map(({ usuarios, servicePrincipal, asignaciones }) => ({
          users: resolverRolesPorUsuario(
            usuarios?.value,
            servicePrincipal?.appRoles,
            asignaciones?.value,
          ),
          roles: construirCatalogoDeRoles(servicePrincipal?.appRoles),
        })),
      ),
    );
  }

  /**
   * Adquiere silenciosamente un **Access Token de Graph** y lo inyecta como
   * Bearer.
   *
   * Es `accessToken`, no `idToken`. Graph valida `aud = https://graph.microsoft.com`.
   *
   * Si falta el consentimiento, `acquireTokenSilent` falla con `consent_required`. No se abre un popup: el consentimiento de permisos de
   * lectura del directorio lo otorga un administrador en el portal, y `esErrorDeConsentimiento()` permite indicarlo en la interfaz.
   */
  private conTokenGraph<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const account =
      this.authService?.instance.getActiveAccount() ??
      this.authService?.instance.getAllAccounts()[0];

    if (!this.authService || !account) {
      return throwError(
        () => new Error('No hay una sesión activa para consultar Microsoft Graph.'),
      );
    }

    if (!this.authService.instance.getActiveAccount()) {
      this.authService.instance.setActiveAccount(account);
    }

    return this.authService.acquireTokenSilent({ ...graphRequest, account }).pipe(
      switchMap((tokenResult) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${tokenResult.accessToken}`,
        });
        return request(headers);
      }),
    );
  }
}
