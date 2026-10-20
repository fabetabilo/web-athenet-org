import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'

@Component({
  selector: 'app-admin-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class AdminHomeComponent {
  private readonly authService = inject(MsalService, { optional: true })

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Admin'
}
