import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastComponent, type ToastVariant } from '../components/toast/toast';

/**
 * Servicio centralizado de notificaciones (toasts) para confirmar acciones
 * del usuario (crear/editar/eliminar, etc.) en toda la app. Envuelve
 * MatSnackBar con un componente propio (ToastComponent) para mantener el
 * estilo del design system en vez del snackbar por defecto de Material.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  private show(message: string, variant: ToastVariant): void {
    this.snackBar.openFromComponent(ToastComponent, {
      data: { message, variant },
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['athenet-toast-panel'],
    });
  }
}
