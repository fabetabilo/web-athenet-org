import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>Panel de Dirección</h1>
        <p>Bienvenido, {{ accountName }}</p>
        <button class="logout-btn" type="button" (click)="logout()">Cerrar sesión</button>
      </div>
      <p class="placeholder-note">🚧 Dashboard del Director — En construcción</p>
    </div>
  `,
  styles: [`
    .dashboard { padding: 2rem; font-family: Inter, sans-serif; }
    .dashboard-header { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem; }
    h1 { margin: 0; font-size: 1.5rem; color: #0f172a; }
    p { margin: 0; color: #64748b; }
    .logout-btn { margin-left: auto; padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; background: #fff; cursor: pointer; font-family: inherit; }
    .logout-btn:hover { background: #f8fafc; }
    .placeholder-note { color: #94a3b8; font-size: 0.875rem; }
  `],
})
export class DirectorComponent {
  private readonly authService = inject(MsalService, { optional: true })
  protected readonly accountName = this.authService?.instance.getActiveAccount()?.name ?? 'Director'

  logout(): void {
    this.authService?.logoutRedirect({ postLogoutRedirectUri: environment.redirectUri }).subscribe()
  }
}
