import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="unauth-container">
      <div class="unauth-content">
        <span class="unauth-icon">🔒</span>
        <h1>Acceso no autorizado</h1>
        <p>
          Tu cuenta está autenticada, pero no tiene un rol asignado
          en el sistema Athenet. Contacta al administrador.
        </p>
        <a routerLink="/login" class="back-link">Volver al inicio</a>
      </div>
    </div>
  `,
  styles: [`
    .unauth-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100dvh;
      font-family: Inter, sans-serif;
      background: #f8fafc;
    }
    .unauth-content {
      text-align: center;
      max-width: 400px;
      padding: 2rem;
    }
    .unauth-icon { font-size: 3rem; }
    h1 { font-size: 1.5rem; color: #0f172a; margin: 1rem 0 0.5rem; }
    p { color: #64748b; line-height: 1.6; margin: 0 0 1.5rem; }
    .back-link {
      display: inline-block;
      padding: 0.625rem 1.25rem;
      border-radius: 0.375rem;
      background: #0f172a;
      color: #fff;
      text-decoration: none;
      font-size: 0.875rem;
    }
    .back-link:hover { background: #1e293b; }
  `],
})
export class UnauthorizedComponent {}
