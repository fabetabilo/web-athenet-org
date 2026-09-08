import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { environment } from '../../../environments/environment'
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar'

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <div class="layout-wrapper">
      <app-sidebar
        [menuItems]="directorMenuItems"
        [accountName]="accountName"
        [userRole]="userRole"
        (logoutClick)="logout()">
      </app-sidebar>
      <div class="dashboard-content">
        <div class="dashboard-header">
          <h1>Panel de Dirección</h1>
          <p>Bienvenido, {{ accountName }}</p>
        </div>
        <p class="placeholder-note">🚧 Dashboard del Director — En construcción</p>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper { display: flex; height: 100vh; width: 100%; font-family: var(--font-family-base); }
    .dashboard-content { flex: 1; overflow-y: auto; padding: 2.5rem 3rem; background: var(--bg-main); }
    .dashboard-header { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border-color); }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.02em; }
    p { margin: 0; font-size: 0.9375rem; color: var(--text-muted); }
    .placeholder-note { color: var(--text-muted); font-size: 0.875rem; padding: 1.5rem; background: #fff; border: 1px solid var(--border-color); border-radius: 0.75rem; }
  `],
})
export class DirectorComponent {
  private readonly authService = inject(MsalService, { optional: true })

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Director'

  protected readonly userRole = 'Director'

  protected readonly directorMenuItems: MenuItem[] = [
    { label: 'Panel de Control', icon: 'dashboard', route: '/director' },
    { label: 'Estadísticas', icon: 'analytics', route: '/director/stats' },
    { label: 'Aprobaciones', icon: 'fact_check', route: '/director/approvals' },
  ]

  logout(): void {
    this.authService?.logoutRedirect({ postLogoutRedirectUri: environment.redirectUri }).subscribe()
  }
}
