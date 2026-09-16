import type { RedirectRequest } from '@azure/msal-browser'
import { environment } from '../environments/environment'

/**
 * Scope propio de la API: `api://{clientId}/access_as_user`
 * Produce un Access Token con aud = api://{clientId}, scp = access_as_user.
 * Spring validara ese aud en `audiences` de application.yml.
 *
 * NOTA: En caso de necesitar Graph y API a la vez, agregar 'User.Read' a este array
 */
const apiScope = `api://${environment.clientId}/access_as_user`

export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', apiScope],
}
