import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { RouterOutlet } from '@angular/router'
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar'
import { TopbarComponent } from '../../shared/components/topbar/topbar'
import { SessionService } from '../../shared/services/session.service'

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, RouterOutlet],
  templateUrl: './director.html',
  styleUrl: './director.scss',
})
export class DirectorComponent {
  private readonly authService = inject(MsalService, { optional: true })
  private readonly session = inject(SessionService)

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Director'

  protected readonly userRole = 'Director'

  protected readonly directorMenuItems: MenuItem[] = [
    { label: 'Panel de Control', icon: 'dashboard', route: '/director' },
    { label: 'Eventos', icon: 'analytics', route: '/director/events' },
    { label: 'Estadísticas', icon: 'analytics', route: '/director/stats' },
    { label: 'Aprobaciones', icon: 'fact_check', route: '/director/approvals' },
  ]

  /** El cierre de sesión vive en SessionService: es el mismo para los dos shells. */
  logout(): void {
    this.session.logout()
  }
}
