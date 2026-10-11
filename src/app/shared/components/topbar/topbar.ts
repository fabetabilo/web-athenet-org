import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { SessionTimerComponent } from '../session-timer/session-timer';

/**
 * Barra superior de las vistas con sesión. El `<ng-content>` de la izquierda es
 * lo que la hace crecer como toolbar: acciones globales, notificaciones, etc.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [SessionTimerComponent],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  private readonly session = inject(SessionService);

  // La barra solo existe en el shell autenticado: montarla es la señal de que hay sesión que contar.
  constructor() {
    this.session.start();
  }
}
