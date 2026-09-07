import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { loginRequest } from '../../auth/loginRequest'
import { isAuthConfigured } from '../../auth/msalConfig'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  // optional: null cuando isAuthConfigured = false (sin GUIDs)
  private readonly authService = inject(MsalService, { optional: true })

  /** Indica si environment.ts tiene GUIDs reales. Usado en el template. */
  protected readonly isAuthConfigured = isAuthConfigured

  /**
   * Inicia el flujo OAuth / OIDC redirect hacia Microsoft Entra ID.
   * El navegador completo se redirige a login.microsoftonline.com.
   * Al volver, app.ts procesa el redirect y navega por rol.
   */
  loginWithMicrosoft(): void {
    if (!this.authService) {
      console.warn(
        '[Athenet] MSAL no configurado. ' +
        'Completa src/environments/environment.ts con los GUIDs del App Registration de Entra ID.',
      )
      return
    }
    // En Angular los Observables NO se ejecutan sin .subscribe()
    this.authService.loginRedirect(loginRequest).subscribe()
  }
}
