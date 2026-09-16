import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '../../../../shared/components/button/button';
import {
  DeporteApiService,
  type Deporte,
  type DeporteInput,
} from '../../services/deporte-api.service';

export interface DeporteFormDialogData {
  /** Presente en modo edición (precarga el form); ausente = crear nuevo */
  deporte?: Deporte;
}

@Component({
  selector: 'app-deporte-form-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './deporte-form-dialog.html',
  styleUrl: './deporte-form-dialog.scss',
})
export class DeporteFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DeporteFormDialogComponent, Deporte>);
  private readonly fb = inject(FormBuilder);
  private readonly deporteApi = inject(DeporteApiService);
  readonly data = inject<DeporteFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly isEdit = !!this.data.deporte;

  readonly form = this.fb.nonNullable.group({
    nombre: [
      this.data.deporte?.nombre ?? '',
      [Validators.required, Validators.maxLength(100)],
    ],
    descripcion: [this.data.deporte?.descripcion ?? ''],
  });

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  onCancel(): void {
    if (this.guardando()) return;
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.guardando()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: DeporteInput = {
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() || null,
    };

    this.guardando.set(true);
    this.error.set(null);

    const request$ = this.isEdit
      ? this.deporteApi.actualizarDeporte(this.data.deporte!.id, payload)
      : this.deporteApi.crearDeporte(payload);

    request$.subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        this.dialogRef.close(resultado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.extraerMensajeError(err));
      },
    });
  }

  private extraerMensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && typeof body.message === 'string') {
        return body.message;
      }
    }
    return this.isEdit
      ? 'No se pudo actualizar el deporte. Verifica que tu cuenta tenga el rol admin.'
      : 'No se pudo crear el deporte. Verifica que tu cuenta tenga el rol admin.';
  }
}
