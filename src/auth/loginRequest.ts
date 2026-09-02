import type { RedirectRequest } from '@azure/msal-browser'

/**
 * Scopes que se solicitan en cada loginRedirect.
 *
 * - openid / profile → ID Token (identidad: quién eres)
 * - User.Read        → permiso delegado de Microsoft Graph (futuro uso)
 *
 * Cuando la API Gateway esté lista, agregar aquí el scope de la API:
 *   'api://TU_API_CLIENT_ID/access_as_user'
 */
export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'User.Read'],
}
