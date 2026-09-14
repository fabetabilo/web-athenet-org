import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent, type ButtonVariant } from '../button/button';

export type DialogSemanticVariant = 'primary' | 'danger' | 'warning' | 'info' | 'neutral';

export interface ConfirmDialogData {
  /** Título principal del diálogo (ej. 'Confirmación de Creación', 'Confirmación de Eliminación') */
  title?: string;

  /** Mensaje principal o pregunta (ej. '¿Deseas publicar este evento?', 'Estás a punto de eliminar:') */
  message?: string;

  /** Nombre del elemento o entidad afectada a destacar entre comillas (opcional) */
  targetName?: string;

  /** Texto secundario aclaratorio o advertencia (opcional) */
  description?: string;

  /** Texto del botón de acción (ej. 'Crear Evento', 'Eliminar', 'Guardar') */
  confirmText?: string;

  /** Variante de estilo para el botón de acción ('primary', 'danger', 'secondary', 'ghost') */
  confirmVariant?: ButtonVariant;

  /** Icono opcional para el botón de confirmación (ej. 'send', 'delete', 'check') */
  confirmIcon?: string | null;

  /** Texto del botón secundario para cancelar o cerrar (default: 'Cancelar') */
  cancelText?: string;

  /** Nombre de icono de Material para el encabezado visual (null para ocultar icono) */
  icon?: string | null;

  /** Variante semántica de color para el encabezado e icono ('primary' | 'danger' | 'warning' | 'info' | 'neutral') */
  variant?: DialogSemanticVariant;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ButtonComponent],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  get safeVariant(): DialogSemanticVariant {
    return this.data.variant ?? (this.data.confirmVariant === 'danger' ? 'danger' : 'primary');
  }

  get defaultIcon(): string {
    switch (this.safeVariant) {
      case 'danger':
        return 'delete_outline';
      case 'warning':
        return 'warning_amber';
      case 'info':
        return 'info_outline';
      case 'neutral':
        return 'help_outline';
      case 'primary':
      default:
        return 'check_circle_outline';
    }
  }

  get defaultConfirmVariant(): ButtonVariant {
    return this.safeVariant === 'danger' ? 'danger' : 'primary';
  }

  get defaultConfirmText(): string {
    return this.safeVariant === 'danger' ? 'Eliminar' : 'Confirmar';
  }

  get defaultConfirmIcon(): string | null {
    if (this.safeVariant === 'danger') return 'delete';
    if (this.safeVariant === 'primary') return 'check';
    return null;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

/** Alias para reutilización como submit-dialog en formularios */
export { ConfirmDialogComponent as SubmitDialogComponent };

