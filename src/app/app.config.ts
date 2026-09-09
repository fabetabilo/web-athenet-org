import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core'
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
import { lastValueFrom } from 'rxjs'
import { routes } from './app.routes'
import { msalConfig } from '../auth/msalConfig'

/** Providers base: siempre activos */
const baseProviders = [
  provideBrowserGlobalErrorListeners(),
  provideRouter(routes),
  provideAnimationsAsync(),
]

/** Factory síncrona: crea la instancia MSAL (sin inicializar aún). */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig)
}

/**
 * APP_INITIALIZER que:
 * 1. Llama initialize() (obligatorio en @azure/msal-browser v5.x)
 * 2. Procesa el redirect pendiente ANTES de renderizar la app
 *
 * Esto evita el error interaction_in_progress al hacer login después de logout.
 */
function msalInitializer(msalService: MsalService) {
  return () =>
    msalService.instance.initialize()
      .then(() => lastValueFrom(msalService.handleRedirectObservable()))
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
 * El APP_INITIALIZER asegura que initialize() y handleRedirectObservable()
 * se ejecuten antes de renderizar cualquier componente.
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
    {
      provide: APP_INITIALIZER,
      useFactory: msalInitializer,
      deps: [MsalService],
      multi: true,
    },
  ],
}

