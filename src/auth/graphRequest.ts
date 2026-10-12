import type { SilentRequest } from '@azure/msal-browser'

export const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Scopes de Microsoft Graph para la vista de usuarios (`/admin/users`). Por ahora, son permisos de lectura: listan el directorio y el
 * catálogo de app roles del service principal.
 *
 * Exigen **consentimiento del administrador global** en el tenant: sin él,
 * `acquireTokenSilent` falla con `consent_required`.
 *
 * TEMPORAL (solo desarrollo): el director también pide este token para listar
 * delegados (`DevDelegatesService`). Debe dejar de hacerlo cuando el BFF exponga
 * `GET /api/v1/delegates`; ver la advertencia en ese servicio.
 *
 * NOTA: aquí >podria< ir el `AppRoleAssignment.ReadWrite.All` para asignar los roles aqui mismo, e incluso crear cuentas.
 */
export const graphRequest: SilentRequest = {
  scopes: ['User.Read.All', 'Application.Read.All'],
}
