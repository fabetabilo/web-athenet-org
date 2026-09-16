import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { switchMap, of } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { PillComponent, type PillVariant } from '../../../../shared/components/pill/pill';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  DirectorApiService,
  type AthenetEvent,
} from '../../services/director-api.service';

// ── Opciones de catálogo (mismo conjunto que la tabla de events) ──────────────
export const CATEGORY_OPTIONS = [
  { label: 'Fútbol', value: 'FUTBOL' },
  { label: 'Básquetbol', value: 'BASQUETBOL' },
  { label: 'Vóleibol', value: 'VOLEIBOL' },
  { label: 'Ajedrez', value: 'AJEDREZ' },
  { label: 'Tenis', value: 'TENIS' },
  { label: 'Natación', value: 'NATACION' },
  { label: 'Fútsal', value: 'FUTSAL' },
  { label: 'Vóleibol Playa', value: 'VOLEIBOL_PLAYA' },
  { label: 'Balonmano', value: 'BALON_MANO' },
  { label: 'Rugby', value: 'RUGBY' },
  { label: 'Judo', value: 'JUDO' },
  { label: 'Kárate', value: 'KARATE' },
  { label: 'Taekwondo', value: 'TAEKWONDO' },
  { label: 'Tenis de Mesa', value: 'TENIS_MESA' },
  { label: 'Gimnasia', value: 'GIMNASIA' },
  { label: 'Gimnasia Rítmica', value: 'GIMNASIA_RITMICA' },
  { label: 'Escalada Deportiva', value: 'ESCALADA_DEPORTIVA' },
  { label: 'Levantamiento de Pesas', value: 'LEVANTAMIENTO_PESAS' },
  { label: 'Cross Country', value: 'CROSS_COUNTRY' },
  { label: 'Atletismo', value: 'ATLETISMO' },
];

export const TYPE_OPTIONS = [
  { label: 'Partido', value: 'MATCH' },
  { label: 'Reunión', value: 'MEETING' },
  { label: 'Jornada de Pista', value: 'TRACKDAY' },
  { label: 'Otro', value: 'OTHER' },
];

export const STATUS_OPTIONS = [
  { label: 'Publicado', value: 'PUBLISHED' },
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    ButtonComponent,
    PillComponent,
  ],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly directorApi = inject(DirectorApiService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  protected readonly event    = signal<AthenetEvent | null>(null);
  protected readonly loading  = signal<boolean>(true);
  protected readonly error    = signal<string | null>(null);
  /** Controla si el formulario está en modo edición o lectura */
  protected readonly isEdit   = signal<boolean>(false);
  /** true cuando se está creando un nuevo evento en lugar de editar uno existente */
  protected readonly isCreateMode = signal<boolean>(false);
  /** true mientras la petición updateEvent/createEvent está en vuelo */
  protected readonly isSaving = signal<boolean>(false);

  // Catálogos expuestos al template
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected form!: FormGroup;

  ngOnInit(): void {
    // Construir el formulario deshabilitado (modo lectura)
    this.form = this.fb.group({
      internalId:      [{ value: '', disabled: true }, Validators.required],
      title:           [{ value: '', disabled: true }, Validators.required],
      category:        [{ value: '', disabled: true }, Validators.required],
      type:            [{ value: '', disabled: true }, Validators.required],
      eventDate:       [{ value: null, disabled: true }, Validators.required],
      status:          [{ value: '', disabled: true }, Validators.required],
      isOfficial:      [{ value: false, disabled: true }],
      location:        [{ value: '', disabled: true }],
      address:         [{ value: '', disabled: true }],
      description:     [{ value: '', disabled: true }],
      descriptionOpt:  [{ value: '', disabled: true }],
      coverImage:      [{ value: '', disabled: true }, Validators.required],
      photos:          this.fb.array([]),
      organizationId:  [{ value: null, disabled: true }, Validators.required],
      teamOneId:       [{ value: null, disabled: true }],
      teamTwoId:       [{ value: null, disabled: true }],
    });

    // Resolución del evento: primero desde la ruta de lista cargada; fallback API
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const internalId = params.get('internalId') ?? '';
          if (internalId === 'new') {
            return of(null);
          }
          // Si ya tenemos el evento cargado (ej. tras una creación exitosa) y
          // la URL simplemente se actualizó con replaceUrl, no volvemos a la API.
          const loaded = this.event();
          if (loaded && loaded.internalId === internalId) {
            return of(loaded);
          }
          return this.directorApi.getEventByInternalId(internalId);
        }),
      )
      .subscribe({
        next: (ev) => {
          if (!ev) {
            this.isCreateMode.set(true);
            this.isEdit.set(true);
            this.form.enable();
            this.loading.set(false);
            return;
          }
          this.event.set(ev);
          this._patchForm(ev);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el evento. Verifica que el backend esté en ejecución.');
          this.loading.set(false);
        },
      });
  }

  // ── Getters de utilidad ────────────────────────────────────────────────────

  get photosArray(): FormArray {
    return this.form.get('photos') as FormArray;
  }

  protected getStatusVariant(status: string): PillVariant {
    switch (status) {
      case 'PUBLISHED': return 'success';
      case 'DRAFT':     return 'warning';
      case 'CANCELLED': return 'danger';
      default:          return 'neutral';
    }
  }

  protected getStatusLabel(status: string): string {
    return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  }

  protected getCategoryLabel(category: string): string {
    return CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  onBack(): void {
    this.router.navigate(['/director/events']);
  }

  /** Habilita todos los controles del formulario y activa el modo edición */
  onEdit(): void {
    this.form.enable();
    // El ID Interno nunca se puede modificar en modo edición
    this.form.get('internalId')?.disable();
    this.photosArray.controls.forEach((c) => c.enable());
    this.form.markAsPristine();
    this.isEdit.set(true);
  }

  /**
   * Cancela la edición o creación.
   * Si el formulario tiene cambios sin guardar, abre un ConfirmDialog de advertencia.
   * Si no hay cambios, restaura el modo lectura o vuelve a la lista (en creación).
   */
  onCancelEdit(): void {
    if (this.form.dirty) {
      const data: ConfirmDialogData = {
        title: '¿Descartar Cambios?',
        message: 'Tienes modificaciones pendientes en el formulario.',
        description: 'Si cancelas ahora, todos los datos no guardados se perderán.',
        confirmText: 'Descartar',
        confirmVariant: 'danger',
        confirmIcon: 'delete_sweep',
        cancelText: 'Continuar editando',
        variant: 'warning',
        icon: 'warning_amber',
      };
      const ref = this.dialog.open(ConfirmDialogComponent, {
        data,
        width: '460px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      });
      ref.afterClosed().subscribe((discard: boolean) => {
        if (discard) {
          if (this.isCreateMode()) {
            this.router.navigate(['/director/events']);
          } else {
            this._restoreReadMode();
          }
        }
      });
    } else {
      if (this.isCreateMode()) {
        this.router.navigate(['/director/events']);
      } else {
        this._restoreReadMode();
      }
    }
  }

  /**
   * Valida el formulario, abre un ConfirmDialog de confirmación y llama a createEvent o updateEvent.
   * En éxito: actualiza el Signal event() y restaura el modo lectura, o navega a la nueva ruta si se creó.
   * En error: muestra el banner de error.
   */
  onSave(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const ev = this.event();
    const targetName = this.isCreateMode() ? this.form.get('title')?.value : ev?.title;
    
    const data: ConfirmDialogData = {
      title: this.isCreateMode() ? 'Crear Evento' : 'Guardar Cambios',
      message: this.isCreateMode()
        ? '¿Confirmas la creación de este nuevo evento'
        : '¿Confirmas los cambios realizados al evento',
      targetName,
      confirmText: this.isCreateMode() ? 'Crear' : 'Guardar',
      confirmVariant: 'primary',
      confirmIcon: 'save',
      cancelText: 'Seguir editando',
      variant: 'primary',
      icon: 'edit_note',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '460px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.isSaving.set(true);
      this.error.set(null);
      const payload = this._buildPayload();

      if (this.isCreateMode()) {
        this.directorApi.createEvent(payload).subscribe({
          next: (created) => {
            // Poblar el Signal con el evento devuelto por el backend y pasar a modo lectura
            // sin disparar un ciclo de navegación que volvería a llamar a la API
            this.event.set(created);
            this._patchForm(created);
            this.isCreateMode.set(false);
            this._restoreReadMode();
            this.isSaving.set(false);
            // Actualizar la URL sin recargar el componente
            this.router.navigate(
              ['/director/events', created.internalId],
              { replaceUrl: true, skipLocationChange: false },
            );
          },
          error: (err: unknown) => {
            console.error('Error al crear evento:', err);
            this.error.set('No se pudo crear el evento. Por favor, intenta nuevamente.');
            this.isSaving.set(false);
          },
        });
      } else {
        const id = ev!.id ?? ev!.internalId;
        this.directorApi.updateEvent(id, payload).subscribe({
          next: (updated) => {
            this.event.set(updated);
            this.isSaving.set(false);
            this._restoreReadMode();
          },
          error: (err: unknown) => {
            console.error('Error al guardar evento:', err);
            this.error.set('No se pudieron guardar los cambios. Por favor, intenta nuevamente.');
            this.isSaving.set(false);
          },
        });
      }
    });
  }

  /** Agrega un control vacío al FormArray de fotos */
  addPhoto(): void {
    this.photosArray.push(this.fb.control(''));
    this.form.markAsDirty();
  }

  /** Elimina la foto en la posición dada del FormArray */
  removePhoto(index: number): void {
    this.photosArray.removeAt(index);
    this.form.markAsDirty();
  }

  onDelete(): void {
    const ev = this.event();
    if (!ev) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmación de Eliminación',
        message: 'Estás a punto de eliminar el evento',
        targetName: ev.title,
        description: 'Esta acción no se puede deshacer y removerá permanentemente el registro.',
        confirmText: 'Eliminar',
        confirmVariant: 'danger',
        confirmIcon: 'delete',
        cancelText: 'Cancelar',
        variant: 'danger',
        icon: 'delete_outline',
      },
      width: '460px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const id = ev.id ?? ev.internalId;
      this.loading.set(true);
      this.directorApi.deleteEvent(id).subscribe({
        next: () => this.router.navigate(['/director/events']),
        error: (err: unknown) => {
          console.error('Error al eliminar evento:', err);
          this.error.set(`No se pudo eliminar el evento "${ev.title}". Por favor, intenta nuevamente.`);
          this.loading.set(false);
        },
      });
    });
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  /**
   * Restaura el formulario con los valores del Signal event() (sin llamar a la API)
   * y deshabilita todos los controles volviendo al modo lectura.
   */
  private _restoreReadMode(): void {
    const ev = this.event();
    if (ev) this._patchForm(ev);
    this.form.disable();
    this.photosArray.controls.forEach((c) => c.disable());
    this.form.markAsPristine();
    this.isEdit.set(false);
  }

  /**
   * Construye el payload para updateEvent() desde los valores actuales del formulario.
   * Serializa la fecha como string "yyyy-MM-dd" que espera el backend.
   */
  private _buildPayload(): Partial<AthenetEvent> {
    const raw = this.form.getRawValue();
    const eventDate = raw.eventDate instanceof Date
      ? raw.eventDate.toISOString().split('T')[0]
      : (raw.eventDate ?? '');
    
    const originalEvent = this.event();
    const internalId = this.isCreateMode()
      ? (raw.internalId ? String(raw.internalId).trim() : '')
      : (originalEvent?.internalId ?? raw.internalId ?? '');

    return {
      ...raw,
      id: originalEvent?.id,
      internalId,
      eventDate,
      photos: (this.photosArray.getRawValue() as string[]).filter((u: string) => u.trim() !== ''),
    };
  }

  private _patchForm(ev: AthenetEvent): void {
    // Reconstruir el FormArray de photos (siempre disabled al patchear)
    const photosArray = this.form.get('photos') as FormArray;
    photosArray.clear();
    (ev.photos ?? []).forEach((url) => {
      photosArray.push(this.fb.control({ value: url, disabled: true }));
    });

    // Parsear la fecha: el backend devuelve "yyyy-MM-dd"
    let eventDateValue: Date | null = null;
    if (ev.eventDate) {
      const parsed = new Date(ev.eventDate);
      eventDateValue = isNaN(parsed.getTime()) ? null : parsed;
    }

    this.form.patchValue({
      internalId:     ev.internalId ?? '',
      title:          ev.title,
      category:       ev.category,
      type:           ev.type ?? '',
      eventDate:      eventDateValue,
      status:         ev.status,
      isOfficial:     ev.isOfficial,
      location:       ev.location,
      address:        ev.address ?? '',
      description:    ev.description ?? '',
      descriptionOpt: ev.descriptionOpt ?? '',
      coverImage:     ev.coverImage ?? '',
      organizationId: ev.organizationId ?? null,
      teamOneId:      ev.teamOneId ?? null,
      teamTwoId:      ev.teamTwoId ?? null,
    });
  }
}
