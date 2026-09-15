import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastData {
  message: string;
  variant: ToastVariant;
}

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class ToastComponent {
  private readonly snackBarRef = inject(MatSnackBarRef<ToastComponent>);
  readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);

  readonly icon = TOAST_ICONS[this.data.variant];

  close(): void {
    this.snackBarRef.dismiss();
  }
}
