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
import { switchMap } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { PillComponent, type PillVariant } from '../../../../shared/components/pill/pill';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
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

  protected readonly event = signal<AthenetEvent | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  /** Preparado para fase de edición. Por ahora siempre false. */
  protected readonly isEdit = signal<boolean>(false);

  // Catálogos expuestos al template
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected form!: FormGroup;

  ngOnInit(): void {
    // Construir el formulario deshabilitado (modo lectura)
    this.form = this.fb.group({
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
      coverImage:      [{ value: '', disabled: true }],
      photos:          this.fb.array([]),
      organizationId:  [{ value: null, disabled: true }],
      teamOneId:       [{ value: null, disabled: true }],
      teamTwoId:       [{ value: null, disabled: true }],
    });

    // Resolución del evento: primero desde la ruta de lista cargada; fallback API
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const internalId = params.get('internalId') ?? '';
          return this.directorApi.getEventByInternalId(internalId);
        }),
      )
      .subscribe({
        next: (ev) => {
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

  /** Stub: activa modo edición en fase posterior */
  onEdit(): void {
    // TODO (fase 2): habilitar controles del formulario y mostrar botones Guardar/Cancelar
    console.log('Editar evento (fase 2)');
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

  private _patchForm(ev: AthenetEvent): void {
    // Reconstruir el FormArray de photos
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
