import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '../../../../shared/components/button/button';
import {
  EquipoApiService,
  type Equipo,
  type EquipoInput,
  type Categoria,
} from '../../services/equipo-api.service';
import { SedeApiService, type Sede } from '../../services/sede-api.service';
import { DeporteApiService, type Deporte } from '../../services/deporte-api.service';
import { InstitucionApiService, type Institucion } from '../../services/institucion-api.service';

export interface EquipoFormDialogData {
  /** Presente en modo edición (precarga el form); ausente = crear nuevo */
  equipo?: Equipo;
}

interface CategoriaOption {
  value: Categoria;
  label: string;
}

const CATEGORIA_OPTIONS: CategoriaOption[] = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'MIXTO', label: 'Mixto' },
];

@Component({
  selector: 'app-equipo-form-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './equipo-form-dialog.html',
  styleUrl: './equipo-form-dialog.scss',
})
export class EquipoFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EquipoFormDialogComponent, Equipo>);
  private readonly fb = inject(FormBuilder);
  private readonly equipoApi = inject(EquipoApiService);
  private readonly sedeApi = inject(SedeApiService);
  private readonly deporteApi = inject(DeporteApiService);
  private readonly institucionApi = inject(InstitucionApiService);
  readonly data = inject<EquipoFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly isEdit = !!this.data.equipo;
  readonly categoriaOptions = CATEGORIA_OPTIONS;

  readonly form = this.fb.group({
    institucionId: [null as number | null, [Validators.required]],
    sedeId: [this.data.equipo?.sedeId ?? null, [Validators.required]],
    deporteId: [this.data.equipo?.deporteId ?? null, [Validators.required]],
    nombre: [
      this.data.equipo?.nombre ?? '',
      [Validators.required, Validators.maxLength(150)],
    ],
    categoria: [this.data.equipo?.categoria ?? null, [Validators.required]],
    entrenador: [this.data.equipo?.entrenador ?? ''],
    logoUrl: [this.data.equipo?.logoUrl ?? ''],
  });

  /** Opciones para los selectores de institución, sede y deporte. */
  protected readonly instituciones = signal<Institucion[]>([]);
  protected readonly sedes = signal<Sede[]>([]);
  protected readonly deportes = signal<Deporte[]>([]);
  protected readonly cargandoOpciones = signal(true);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    let pendientes = 3;
    const marcarListo = () => {
      pendientes -= 1;
      if (pendientes === 0) this.cargandoOpciones.set(false);
    };

    this.institucionApi.getInstituciones().subscribe({
      next: (data) => {
        this.instituciones.set(data);
        marcarListo();
      },
      error: (err) => {
        console.error('Error al obtener instituciones para el formulario de equipo:', err);
        marcarListo();
      },
    });

    this.sedeApi.getSedes().subscribe({
      next: (data) => {
        this.sedes.set(data);
        // En modo edición, la sede ya está fijada; deducimos su institución
        // para precargar el selector sin que el usuario tenga que adivinarla.
        if (this.isEdit && this.data.equipo) {
          const sedeActual = data.find((s) => s.id === this.data.equipo!.sedeId);
          if (sedeActual) {
            this.form.controls.institucionId.setValue(sedeActual.institucionId, { emitEvent: false });
          }
        }
        marcarListo();
      },
      error: (err) => {
        console.error('Error al obtener sedes para el formulario de equipo:', err);
        marcarListo();
      },
    });

    this.deporteApi.getDeportes().subscribe({
      next: (data) => {
        this.deportes.set(data);
        marcarListo();
      },
      error: (err) => {
        console.error('Error al obtener deportes para el formulario de equipo:', err);
        marcarListo();
      },
    });
  }

  /** Sedes de la institución seleccionada (institucionId no se envía al backend, es solo un filtro de UI). */
  get sedesFiltradas(): Sede[] {
    const institucionId = this.form.controls.institucionId.value;
    if (institucionId == null) return [];
    return this.sedes().filter((sede) => sede.institucionId === institucionId);
  }

  get sedePlaceholder(): string {
    if (!this.form.controls.institucionId.value) {
      return 'Primero selecciona una institución';
    }
    if (this.sedesFiltradas.length === 0) {
      return 'Esta institución no tiene sedes registradas';
    }
    return 'Selecciona una sede';
  }

  /** Al cambiar de institución, la sede seleccionada deja de ser válida. */
  onInstitucionChange(): void {
    this.form.controls.sedeId.setValue(null);
    this.form.controls.sedeId.markAsUntouched();
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
    const payload: EquipoInput = {
      nombre: (raw.nombre ?? '').trim(),
      categoria: raw.categoria as Categoria,
      entrenador: (raw.entrenador ?? '').trim() || null,
      logoUrl: (raw.logoUrl ?? '').trim() || null,
      sedeId: raw.sedeId as number,
      deporteId: raw.deporteId as number,
    };

    this.guardando.set(true);
    this.error.set(null);

    const request$ = this.isEdit
      ? this.equipoApi.actualizarEquipo(this.data.equipo!.id, payload)
      : this.equipoApi.crearEquipo(payload);

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
      ? 'No se pudo actualizar el equipo. Verifica que tu cuenta tenga el rol admin.'
      : 'No se pudo crear el equipo. Verifica que tu cuenta tenga el rol admin.';
  }
}
