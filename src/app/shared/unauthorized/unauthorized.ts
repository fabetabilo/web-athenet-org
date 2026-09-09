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
      font-family: var(--font-family-base);
      background: var(--color-bg-main);
    }
    .unauth-content {
      text-align: center;
      max-width: 400px;
      padding: var(--space-8);
    }
    .unauth-icon { font-size: 3rem; }
    h1 {
      font-size: 1.5rem;
      color: var(--color-text-heading);
      margin: var(--space-4) 0 var(--space-2);
    }
    p {
      color: var(--color-text-muted);
      line-height: 1.6;
      margin: 0 0 var(--space-6);
    }
    .back-link {
      display: inline-block;
      padding: 0.625rem var(--space-5);
      border-radius: var(--radius-md);
      background: var(--color-slate-900);
      color: var(--color-white);
      text-decoration: none;
      font-size: 0.875rem;
      transition: background var(--transition-fast);
    }
    .back-link:hover {
      background: var(--color-slate-800);
    }
  `],
})
export class UnauthorizedComponent {}
