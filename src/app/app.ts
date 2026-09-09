import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MsalBroadcastService, MsalService } from '@azure/msal-angular'
import { InteractionStatus } from '@azure/msal-browser'
import { filter } from 'rxjs/operators'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly router = inject(Router)

  // optional: null cuando el bootstrap fue sin MSAL (isAuthConfigured = false)
  private readonly authService = inject(MsalService, { optional: true })
  private readonly msalBroadcast = inject(MsalBroadcastService, { optional: true })

  ngOnInit(): void {
    if (!this.authService || !this.msalBroadcast) return

    /**
     * Cuando MSAL termina cualquier interacción (login/logout/redirect),
     * evaluamos si hay cuenta activa y navegamos al dashboard correspondiente.
     * El redirect ya fue procesado por el APP_INITIALIZER en app.config.ts.
     */
    this.msalBroadcast.inProgress$
      .pipe(
        filter((status) => status === InteractionStatus.None),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const accounts = this.authService!.instance.getAllAccounts()

        // Establecer cuenta activa si hay alguna pero no hay una activa aún
        if (accounts.length > 0 && !this.authService!.instance.getActiveAccount()) {
          this.authService!.instance.setActiveAccount(accounts[0])
        }

        // Solo navegar si hay cuenta activa y el usuario está en /login o /
        const activeAccount = this.authService!.instance.getActiveAccount()
        const currentUrl = this.router.url
        const onAuthRoute = currentUrl === '/login' || currentUrl === '/'
        if (activeAccount && onAuthRoute) {
          this.navigateByRole()
        }
      })
  }

  /**
   * Lee el claim 'roles' del ID Token y navega al dashboard correspondiente.
   * Los App Roles deben estar configurados en el App Registration de Entra ID.
   */
  private navigateByRole(): void {
    const account = this.authService!.instance.getActiveAccount()
    const roles = (account?.idTokenClaims?.['roles'] as string[]) ?? []

    if (roles.includes('admin')) {
      this.router.navigate(['/admin'])
    } else if (roles.includes('director')) {
      this.router.navigate(['/director'])
    } else {
      // Usuario autenticado pero sin rol asignado en la app
      this.router.navigate(['/unauthorized'])
    }
  }
}
