import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { RouterOutlet } from '@angular/router'
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar'
import { TopbarComponent } from '../../shared/components/topbar/topbar'
import { SessionService } from '../../shared/services/session.service'

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminDashboardComponent {
  private readonly authService = inject(MsalService, { optional: true })
  private readonly session = inject(SessionService)

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

  /** El cierre de sesión vive en SessionService: es el mismo para los dos shells. */
  logout(): void {
    this.session.logout()
  }
}
