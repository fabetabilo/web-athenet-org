import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  /**
   * Initiates the Microsoft / Entra ID login flow.
   * TODO: replace console.log with MSAL loginRedirect() once clientId is configured.
   */
  loginWithMicrosoft(): void {
    console.log('Initiating Microsoft Entra ID login...');
  }
}
