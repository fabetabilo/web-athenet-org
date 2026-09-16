import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { SedeApiService, type Sede, type SedeInput } from '../../services/sede-api.service';
import {
  InstitucionApiService,
  type Institucion,
} from '../../services/institucion-api.service';

export interface SedeFormDialogData {
  /** Presente en modo edición (precarga el form); ausente = crear nueva */
  sede?: Sede;
}

@Component({
  selector: 'app-sede-form-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './sede-form-dialog.html',
  styleUrl: './sede-form-dialog.scss',
})
export class SedeFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SedeFormDialogComponent, Sede>);
  private readonly fb = inject(FormBuilder);
  private readonly sedeApi = inject(SedeApiService);
  private readonly institucionApi = inject(InstitucionApiService);
  readonly data = inject<SedeFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly isEdit = !!this.data.sede;

  readonly form = this.fb.group({
    nombre: [this.data.sede?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    ciudad: [this.data.sede?.ciudad ?? '', [Validators.required, Validators.maxLength(100)]],
    direccion: [this.data.sede?.direccion ?? '', [Validators.required, Validators.maxLength(100)]],
    institucionId: [this.data.sede?.institucionId ?? null, [Validators.required]],
  });

  /** Opciones para el selector de institución. */
  protected readonly instituciones = signal<Institucion[]>([]);
  protected readonly cargandoInstituciones = signal(true);

  /** Progreso de la petición al backend: bloquea los botones y muestra el spinner. */
  protected readonly guardando = signal(false);

  /** Error de la petición, mostrado dentro del propio diálogo. */
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.institucionApi.getInstituciones().subscribe({
      next: (data) => {
        this.instituciones.set(data);
        this.cargandoInstituciones.set(false);
      },
      error: (err) => {
        console.error('Error al obtener instituciones para el formulario de sede:', err);
        this.cargandoInstituciones.set(false);
      },
    });
  }

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
    const payload: SedeInput = {
      nombre: (raw.nombre ?? '').trim(),
      ciudad: (raw.ciudad ?? '').trim(),
      direccion: (raw.direccion ?? '').trim(),
      institucionId: raw.institucionId as number,
    };

    this.guardando.set(true);
    this.error.set(null);

    const request$ = this.isEdit
      ? this.sedeApi.actualizarSede(this.data.sede!.id, payload)
      : this.sedeApi.crearSede(payload);

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
      ? 'No se pudo actualizar la sede. Verifica que tu cuenta tenga el rol admin.'
      : 'No se pudo crear la sede. Verifica que tu cuenta tenga el rol admin.';
  }
}
