import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type PillVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type PillSize = 'sm' | 'md';

@Component({
  selector: 'app-pill',
  standalone: true,
  imports: [NgClass, MatIconModule],
  templateUrl: './pill.html',
  styleUrl: './pill.scss',
})
export class PillComponent {
  /** Variante semántica de color (success, warning, danger, info, neutral) */
  readonly variant = input<PillVariant>('neutral');

  /** Punto luminoso indicador de estado */
  readonly dot = input<boolean>(false);

  /** Nombre de icono opcional de Material Icons */
  readonly icon = input<string | null>(null);

  /** Tamaño: 'sm' (óptimo para tablas) o 'md' */
  readonly size = input<PillSize>('sm');
}
