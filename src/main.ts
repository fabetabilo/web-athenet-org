import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig, msalAppConfig } from './app/app.config'
import { App } from './app/app'
import { isAuthConfigured } from './auth/msalConfig'

// Si hay GUIDs reales → bootstrap con MSAL.
// Si siguen los placeholders → bootstrap sin MSAL (evita crash por clientId inválido).
bootstrapApplication(App, isAuthConfigured ? msalAppConfig : appConfig).catch(
  (err) => console.error(err),
)
