import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { environment } from '../../../environments/environment'
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar'

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './director.html',
  styleUrl: './director.scss',
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
