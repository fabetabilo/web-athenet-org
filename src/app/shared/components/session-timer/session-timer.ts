import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../services/session.service';

/**
 * Contador presentacional: lee los signals de `SessionService` y no tiene reloj
 * propio. La etiqueta dice "Sesión" y no "Token": lo que cuenta es la ventana
 * de sesión, no la vida del token de Entra ID.
 */
@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './session-timer.html',
  styleUrl: './session-timer.scss',
})
export class SessionTimerComponent {
  private readonly session = inject(SessionService);

  protected readonly isWarning = this.session.isWarning;
  protected readonly isCritical = this.session.isCritical;

  /** Tiempo restante en MM:SS, con cero a la izquierda. */
  protected readonly display = computed(() => {
    const total = Math.max(0, this.session.secondsLeft());
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  });

  /** Renueva la ventana: junto al "Continuar sesión" del aviso, la única forma de extenderla. */
  renovar(): void {
    this.session.renew();
  }
}
