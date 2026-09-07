import {
  type Configuration,
  BrowserCacheLocation,
  LogLevel,
} from '@azure/msal-browser'
import { environment } from '../environments/environment'

const clientId = environment.clientId ?? ''
const tenantId = environment.tenantId ?? ''
const redirectUri = environment.redirectUri ?? 'http://localhost:4200'

/**
 * true solo si environment.ts contiene GUIDs reales.
 * Si siguen los placeholders REEMPLAZAR_..., la app mostrará un aviso
 * y NO registrará providers MSAL (un clientId inválido hace fallar MSAL).
 */
export const isAuthConfigured =
  Boolean(clientId) &&
  Boolean(tenantId) &&
  !clientId.startsWith('REEMPLAZAR') &&
  !tenantId.startsWith('REEMPLAZAR')

/** Configuración que recibe PublicClientApplication. */
export const msalConfig: Configuration = {
  auth: {
    clientId,
    // Auth server para este tenant de Entra ID
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    // LocalStorage: la sesión sobrevive a cerrar la pestaña
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
  },
}
