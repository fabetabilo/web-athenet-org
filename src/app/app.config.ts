import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import {
  type IPublicClientApplication,
  PublicClientApplication,
} from '@azure/msal-browser'
import {
  MSAL_INSTANCE,
  MsalBroadcastService,
  MsalService,
} from '@azure/msal-angular'
import { routes } from './app.routes'
import { msalConfig } from '../auth/msalConfig'

/** Providers base: siempre activos */
const baseProviders = [
  provideBrowserGlobalErrorListeners(),
  provideRouter(routes),
  provideAnimationsAsync(),
]

/** Factory oficial para MSAL standalone (reemplaza MsalModule.forRoot de NgModule) */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig)
}

/**
 * Caso A: sin GUIDs en environment.ts
 * La app arranca sin MSAL; muestra aviso de configuración incompleta.
 */
export const appConfig: ApplicationConfig = {
  providers: [...baseProviders],
}

/**
 * Caso B: con GUIDs reales
 * Registra la instancia MSAL + los servicios que usan los componentes.
 */
export const msalAppConfig: ApplicationConfig = {
  providers: [
    ...baseProviders,
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory,
    },
    MsalService,
    MsalBroadcastService,
  ],
}
