import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'

@Component({
  selector: 'app-director-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class DirectorHomeComponent {
  private readonly authService = inject(MsalService, { optional: true })

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Director'
}
