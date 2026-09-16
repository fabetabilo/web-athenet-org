import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '../../../../shared/components/button/button';
import {
  InstitucionApiService,
  type Institucion,
  type InstitucionInput,
} from '../../services/institucion-api.service';

export interface InstitucionFormDialogData {
  /** Presente en modo edición (precarga el form); ausente = crear nueva */
  institucion?: Institucion;
}

@Component({
  selector: 'app-institucion-form-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './institucion-form-dialog.html',
  styleUrl: './institucion-form-dialog.scss',
})
export class InstitucionFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<InstitucionFormDialogComponent, Institucion>);
  private readonly fb = inject(FormBuilder);
  private readonly institucionApi = inject(InstitucionApiService);
  readonly data = inject<InstitucionFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly isEdit = !!this.data.institucion;

  readonly form = this.fb.nonNullable.group({
    nombre: [
      this.data.institucion?.nombre ?? '',
      [Validators.required, Validators.maxLength(150)],
    ],
    sigla: [this.data.institucion?.sigla ?? ''],
    imagenUrl: [this.data.institucion?.imagenUrl ?? ''],
    // Nueva institución siempre parte activa; en edición se precarga el
    // estado real y queda disponible para cambiarlo.
    activo: [this.data.institucion?.activo ?? true],
  });

  /** Progreso de la petición al backend: bloquea los botones y muestra el spinner. */
  protected readonly guardando = signal(false);

  /** Error de la petición (nombre duplicado, sin permisos, etc.), mostrado dentro del propio diálogo. */
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
    const payload: InstitucionInput = {
      nombre: raw.nombre.trim(),
      sigla: raw.sigla.trim() || null,
      imagenUrl: raw.imagenUrl.trim() || null,
      activo: raw.activo,
    };

    this.guardando.set(true);
    this.error.set(null);

    const request$ = this.isEdit
      ? this.institucionApi.actualizarInstitucion(this.data.institucion!.id, payload)
      : this.institucionApi.crearInstitucion(payload);

    request$.subscribe({
      next: (resultado) => {
        // Cierra el diálogo con la institución ya creada/actualizada por el
        // backend (con su id y valores reales); el padre solo actualiza la
        // lista y muestra el toast, sin volver a llamar a la API.
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
      ? 'No se pudo actualizar la institución. Verifica que tu cuenta tenga el rol admin.'
      : 'No se pudo crear la institución. Verifica que tu cuenta tenga el rol admin.';
  }
}
