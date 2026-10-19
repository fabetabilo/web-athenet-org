import { Component, inject } from '@angular/core'
import { MsalService } from '@azure/msal-angular'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-delegate-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class DelegateHomeComponent {
  private readonly authService = inject(MsalService, { optional: true })

  protected readonly accountName =
    this.authService?.instance.getActiveAccount()?.name ?? 'Delegado'
}
