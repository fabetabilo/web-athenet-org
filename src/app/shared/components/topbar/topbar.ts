import { Component, computed, inject, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SessionService } from '../../services/session.service';
import { SessionTimerComponent } from '../session-timer/session-timer';

/**
 * Barra superior de las vistas con sesión: contador de sesión a la izquierda y
 * acciones globales + menú de perfil a la derecha. El `<ng-content>` sigue al
 * contador y es lo que la deja crecer como toolbar.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [SessionTimerComponent, MatIconModule, MatMenuModule, TitleCasePipe],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  private readonly session = inject(SessionService);

  /** Display name of the logged-in user */
  readonly accountName = input<string>('Usuario');

  /** Role label shown in the profile menu (e.g. 'Admin', 'Director') */
  readonly userRole = input<string>('');

  /** Emitted when the user clicks "Cerrar sesión" in the profile menu */
  readonly logoutClick = output<void>();

  protected readonly initial = computed(() => this.accountName().charAt(0).toUpperCase());

  // La barra solo existe en el shell autenticado: montarla es la señal de que hay sesión que contar.
  constructor() {
    this.session.start();
  }
}
