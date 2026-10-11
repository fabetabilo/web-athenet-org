import type { SilentRequest } from '@azure/msal-browser'

/**
 * Scopes de Microsoft Graph para la vista de usuarios (`/admin/users`). Por ahora, son permisos de lectura: listan el directorio y el
 * catálogo de app roles del service principal.
 *
 * Exigen **consentimiento del administrador global** en el tenant: sin él,
 * `acquireTokenSilent` falla con `consent_required`.
 *
 * NOTA: aquí >podria< ir el `AppRoleAssignment.ReadWrite.All` para asignar los roles aqui mismo, e incluso crear cuentas.
 */
export const graphRequest: SilentRequest = {
  scopes: ['User.Read.All', 'Application.Read.All'],
}
