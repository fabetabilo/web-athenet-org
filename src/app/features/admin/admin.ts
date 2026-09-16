import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { RouterOutlet } from '@angular/router'
import { environment } from '../../../environments/environment'
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar'

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminDashboardComponent {
  private readonly authService = inject(MsalService, { optional: true })

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Admin'

  protected readonly userRole = 'Admin'

  protected readonly adminMenuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin' },
    { label: 'Instituciones', icon: 'apartment', route: '/admin/instituciones' },
    { label: 'Sedes', icon: 'location_city', route: '/admin/sedes' },
    { label: 'Deportes', icon: 'sports_soccer', route: '/admin/deportes' },
    { label: 'Equipos', icon: 'groups', route: '/admin/equipos' },
    { label: 'Usuarios', icon: 'group', route: '/admin/users' },
    { label: 'Reportes', icon: 'bar_chart', route: '/admin/reports' },
    { label: 'Configuración', icon: 'settings', route: '/admin/settings' },
  ]

  logout(): void {
    // Guardar referencia antes de limpiar, para que MSAL sepa qué sesión cerrar
    const account = this.authService?.instance.getActiveAccount()
    // Limpiar cuenta activa para evitar estado residual en LocalStorage
    this.authService?.instance.setActiveAccount(null)
    this.authService
      ?.logoutRedirect({
        postLogoutRedirectUri: environment.redirectUri,
        account: account ?? undefined,
      })
      .subscribe()
  }
}
