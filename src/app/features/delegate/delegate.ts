import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { RouterOutlet } from '@angular/router'
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar'
import { TopbarComponent } from '../../shared/components/topbar/topbar'
import { SessionService } from '../../shared/services/session.service'

@Component({
  selector: 'app-delegate',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, RouterOutlet],
  templateUrl: './delegate.html',
  styleUrl: './delegate.scss',
})
export class DelegateComponent {
  private readonly authService = inject(MsalService, { optional: true })
  private readonly session = inject(SessionService)

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Delegado'

  protected readonly userRole = 'Delegado'

  protected readonly delegateMenuItems: MenuItem[] = [
    { label: 'Panel de Control', icon: 'dashboard', route: '/delegate' },
    { label: 'Mis eventos', icon: 'event', route: '/delegate/events' },
  ]

  /** El cierre de sesión vive en SessionService: es el mismo para los dos shells. */
  logout(): void {
    this.session.logout()
  }
}
