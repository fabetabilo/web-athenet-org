import { Component, ElementRef, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ButtonVariant = 'primary' | 'danger' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonIconPosition = 'start' | 'end';
export type ButtonType = 'button' | 'submit' | 'reset';

const VALID_VARIANTS: ButtonVariant[] = ['primary', 'danger', 'secondary', 'ghost'];
const VALID_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    '[class.is-disabled]': 'disabled()',
    '[class.is-loading]': 'loading()',
    '[attr.aria-disabled]': 'disabled() || loading()',
  },
})
export class ButtonComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Variante visual y semántica del botón */
  readonly variant = input<ButtonVariant>('primary');

  /** Tamaño del botón: 'sm' (32px), 'md' (40px) o 'lg' (48px) */
  readonly size = input<ButtonSize>('md');

  /** Nombre del icono opcional de Material Icons (ej. 'add', 'delete', 'refresh') */
  readonly icon = input<string | null>(null);

  /** Posición del icono respecto al texto ('start' o 'end') */
  readonly iconPosition = input<ButtonIconPosition>('start');

  /** Indica si la acción está en progreso (muestra spinner y bloquea clicks) */
  readonly loading = input<boolean>(false);

  /** Deshabilita interacciones y opacidad del botón */
  readonly disabled = input<boolean>(false);

  /** Atributo type nativo del botón */
  readonly type = input<ButtonType>('button');

  /** Evento de acción emitido al hacer click cuando el botón está activo */
  readonly btnClick = output<MouseEvent>();

  constructor() {
    // Intercepta clicks en fase de captura para bloquear cualquier (click) host
    // cuando el botón está deshabilitado o en estado loading.
    this.elementRef.nativeElement.addEventListener(
      'click',
      (event: MouseEvent) => {
        if (this.disabled() || this.loading()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  /** Variante normalizada y segura con fallback */
  get safeVariant(): ButtonVariant {
    const v = this.variant();
    return VALID_VARIANTS.includes(v) ? v : 'primary';
  }

  /** Tamaño normalizado y seguro con fallback */
  get safeSize(): ButtonSize {
    const s = this.size();
    return VALID_SIZES.includes(s) ? s : 'md';
  }

  /** Maneja el click en el botón interno emitiendo btnClick */
  onButtonClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.btnClick.emit(event);
  }
}
