import { Component, inject, signal } from '@angular/core'
import { JsonPipe } from '@angular/common'
import { MsalService } from '@azure/msal-angular'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { loginRequest } from '../../../auth/loginRequest'
import {
  ApiService,
  type PublicHolaResponse,
  type PrivateMeResponse,
} from '../../../api/api.service'

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminDashboardComponent {
  private readonly authService = inject(MsalService, { optional: true })
  private readonly apiService = inject(ApiService)

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Admin'

  // --- estado API  ---
  protected readonly loading = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly publicData = signal<PublicHolaResponse | null>(null)
  protected readonly privateData = signal<PrivateMeResponse | null>(null)
  protected readonly apiBaseUrl = this.apiService.getBaseUrl()

  logout(): void {
    this.authService
      ?.logoutRedirect({ postLogoutRedirectUri: environment.redirectUri })
      .subscribe()
  }

  /**
   * Obtiene el ID Token via acquireTokenSilent y llama a ambos endpoints
   * en paralelo. acquireTokenSilent() devuelve un >Observable< en MSAL Angular;
   * firstValueFrom() lo convierte a Promise para poder hacer await.
   */
  async probarApi(): Promise<void> {
    const account =
      this.authService?.instance.getActiveAccount() ??
      this.authService?.instance.getAllAccounts()[0]

    if (!this.authService || !account) {
      this.error.set('No hay sesión activa.')
      return
    }

    this.loading.set(true)
    this.error.set(null)
    this.publicData.set(null)
    this.privateData.set(null)

    try {
      // acquireTokenSilent reutiliza la sesión; no redirige al usuario
      const tokenResult = await firstValueFrom(
        this.authService.acquireTokenSilent({ ...loginRequest, account }),
      )

      // Llamadas en paralelo: pública (sin token) y privada (ID Token)
      const [pub, priv] = await Promise.all([
        this.apiService.fetchPublicHola(),
        this.apiService.fetchPrivateMe(tokenResult.accessToken),  // --> Access Token API
      ])

      this.publicData.set(pub)
      this.privateData.set(priv)
    } catch (err) {
      this.error.set(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la llamada a la API.',
      )
    } finally {
      this.loading.set(false)
    }
  }
}
