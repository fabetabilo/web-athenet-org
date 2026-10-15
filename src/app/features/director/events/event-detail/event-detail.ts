import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Subject, catchError, merge, of, startWith, switchMap } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { PillComponent } from '../../../../shared/components/pill/pill';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  asLocalIsoDate,
  asLocalTime,
  endBeforeStartField,
  parseLocalIsoDate,
  parseLocalTime,
} from '../../../../shared/utils/local-date';
import { DirectorApiService } from '../../services/director-api.service';
import { EventCatalogService } from '../../services/event-catalog.service';
import { DevDelegatesService } from '../../services/dev-delegates.service';
import {
  bffErrorMessage,
  bffFieldErrorCode,
  isRetryableBffError,
  type Delegate,
  type DirectorEvent,
  type EventTypeOption,
  type EventWrite,
  type SportOption,
  type SportRef,
  type TeamRef,
} from '../../services/bff';
import { EVENT_STATUS, STATUS_OPTIONS } from '../event-status';
import { controlErrorMessage } from './control-error';
import {
  TeamPickerComponent,
  seedFromOrganizer,
  seedFromTeam,
  withSelected,
} from './team-picker/team-picker';

/** Solo aplican si el tipo lleva enfrentamiento. */
const MATCHUP_FIELDS = [
  'teamOneInstitutionId',
  'teamOneCampusId',
  'teamOneId',
  'teamTwoInstitutionId',
  'teamTwoCampusId',
  'teamTwoId',
] as const;

/** Solo en eventos que no son partido. */
const ORGANIZER_FIELDS = ['organizerInstitutionId', 'organizerCampusId', 'organizerTeamId'] as const;
const ORGANIZER_REQUIRED = ['organizerInstitutionId', 'organizerCampusId'] as const;

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatNativeDateModule,
    MatIconModule,
    ButtonComponent,
    PillComponent,
    TeamPickerComponent,
  ],
  // Caché de catálogos por formulario.
  providers: [EventCatalogService],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly directorApi = inject(DirectorApiService);
  private readonly catalog = inject(EventCatalogService);
  // TEMPORAL (solo desarrollo): ver advertencia en DevDelegatesService.
  private readonly devDelegates = inject(DevDelegatesService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly event    = signal<DirectorEvent | null>(null);
  protected readonly loading  = signal<boolean>(true);
  protected readonly error    = signal<string | null>(null);
  /** La carga falló por un error temporal del BFF (`503`): se ofrece reintentar. */
  protected readonly canRetryLoad = signal<boolean>(false);
  private readonly reload$ = new Subject<void>();
  protected readonly isEdit   = signal<boolean>(false);
  protected readonly isCreateMode = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Tipos: siempre. El resto: solo al crear o editar.
  protected readonly eventTypes = signal<EventTypeOption[]>([]);
  protected readonly sports = signal<SportOption[]>([]);
  protected readonly sportsError = signal<boolean>(false);
  protected readonly delegates = signal<Delegate[]>([]);
  protected readonly delegatesLoaded = signal<boolean>(false);
  protected readonly delegatesError = signal<string | null>(null);
  private catalogsRequested = false;

  // Valores del formulario que gobiernan la vista.
  private readonly typeValue = signal<string | null>(null);
  protected readonly sportValue = signal<number | null>(null);
  private readonly delegateValue = signal<string | null>(null);
  private readonly teamOneSelected = signal<TeamRef | null>(null);
  private readonly teamTwoSelected = signal<TeamRef | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly status = EVENT_STATUS;
  protected readonly fieldError = (name: string) => controlErrorMessage(this.form.get(name));

  protected readonly hasType = computed(() => !!this.typeValue());

  /** Copia de un partido de copa: solo lectura, se gestiona desde la competencia. */
  protected readonly isCompetitionCopy = computed(() => this.event()?.competitionMatchId != null);

  /** Del catálogo de tipos; sin catálogo, se infiere del evento guardado. */
  protected readonly requiresMatchup = computed(() => {
    const type = this.typeValue();
    if (!type) return false;
    const known = this.eventTypes().find((t) => t.code === type);
    if (known) return known.requiresMatchup;
    const ev = this.event();
    return !!ev && ev.type === type && (ev.teamOne !== null || ev.teamTwo !== null);
  });

  protected readonly typeOptions = computed(() => {
    const ev = this.event();
    const saved: EventTypeOption | null = ev && ev.type === this.typeValue()
      ? { code: ev.type, label: ev.type === 'MATCH' ? 'Partido' : ev.type, requiresMatchup: false }
      : null;
    return withSelected(this.eventTypes(), saved, (t) => t.code);
  });

  protected readonly sportOptions = computed(() => {
    const saved = this.event()?.sport;
    return withSelected<SportRef>(this.sports(), saved?.id === this.sportValue() ? saved : null, (s) => s.id);
  });

  protected readonly delegateOptions = computed(() => {
    const saved = this.event()?.delegate;
    return withSelected(this.delegates(), saved?.oid === this.delegateValue() ? saved : null, (d) => d.oid);
  });

  protected readonly organizerSeed = computed(() => seedFromOrganizer(this.event()?.organizer));
  protected readonly teamOneSeed = computed(() => seedFromTeam(this.event()?.teamOne));
  protected readonly teamTwoSeed = computed(() => seedFromTeam(this.event()?.teamTwo));
  protected readonly teamOneDivision = computed(() => this.teamOneSelected()?.division ?? null);
  protected readonly teamOneId = computed(() => this.teamOneSelected()?.id ?? null);
  protected readonly teamTwoId = computed(() => this.teamTwoSelected()?.id ?? null);

  protected form!: FormGroup;

  ngOnInit(): void {
    this.form = this._buildForm();
    this._watchForm();
    this._loadEventTypes();

    this.route.paramMap
      .pipe(
        // `reload$` repite la carga del mismo internalId (botón Reintentar).
        switchMap((params) => this.reload$.pipe(startWith(undefined), switchMap(() => of(params)))),
        switchMap((params) => {
          const internalId = params.get('internalId') ?? '';
          if (internalId === 'new') {
            return of(null);
          }
          // Tras crear, la URL cambia con replaceUrl: no se vuelve a pedir.
          const loaded = this.event();
          if (loaded && loaded.internalId === internalId) {
            return of(loaded);
          }
          return this.directorApi.getEventByInternalId(internalId).pipe(
            catchError((err: unknown) => {
              console.error('Error al cargar evento:', err);
              this.error.set(
                bffErrorMessage(err, 'No se pudo cargar el evento. Verifica que el backend esté en ejecución.'),
              );
              this.canRetryLoad.set(isRetryableBffError(err));
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (ev) => {
          if (!ev) {
            this.isCreateMode.set(true);
            this.isEdit.set(true);
            this.form.enable();
            this._applyTypeRules();
            this._loadCatalogs();
            this.loading.set(false);
            return;
          }
          this.event.set(ev);
          this._patchForm(ev);
          this.loading.set(false);
        },
      });
  }

  onRetryLoad(): void {
    this.error.set(null);
    this.canRetryLoad.set(false);
    this.loading.set(true);
    this.reload$.next();
  }

  get photosArray(): FormArray {
    return this.form.get('photos') as FormArray;
  }

  protected ctrl(name: string): FormControl<number | null> {
    return this.form.get(name) as FormControl<number | null>;
  }

  /** Delegado guardado que ya no tiene el rol. */
  protected delegateLabel(option: Delegate): string {
    const stale = this.delegatesLoaded() && !this.delegates().some((d) => d.oid === option.oid);
    return stale ? `${option.displayName} (sin rol vigente)` : option.displayName;
  }

  onTeamOneSelected(team: TeamRef | null): void {
    this.teamOneSelected.set(team);
    this.form.get('teamTwoId')?.updateValueAndValidity({ emitEvent: false });
  }

  onTeamTwoSelected(team: TeamRef | null): void {
    this.teamTwoSelected.set(team);
    this.form.get('teamTwoId')?.updateValueAndValidity({ emitEvent: false });
  }

  onTypeSelected(): void {
    const unused = this.requiresMatchup() ? ORGANIZER_FIELDS : MATCHUP_FIELDS;
    unused.forEach((name) => this.form.get(name)?.setValue(null));
  }

  onSportSelected(): void {
    [...MATCHUP_FIELDS, 'organizerTeamId'].forEach((name) => this.form.get(name)?.setValue(null));
  }

  onStartDateChange(): void {
    const eventDate = this.form.get('eventDate');
    const endDate = this.form.get('endDate');
    eventDate?.markAsTouched();
    if (endDate && !endDate.value && eventDate?.value) {
      endDate.setValue(eventDate.value);
    }
  }

  onBack(): void {
    this.router.navigate(['/director/events']);
  }

  onOpenCompetition(): void {
    this.router.navigate(['/director/competitions', this.event()?.competitionId]);
  }

  onEdit(): void {
    if (this.isCompetitionCopy()) return;
    this.form.enable();
    this.form.get('internalId')?.disable();
    this.photosArray.controls.forEach((c) => c.enable());
    // Un deporte eliminado ya no es válido.
    if (this.event()?.sport && this.event()!.sport!.name === null) {
      this.form.get('sportId')?.setValue(null);
    }
    this._applyTypeRules();
    this._loadCatalogs();
    this.form.markAsPristine();
    this.isEdit.set(true);
  }

  /** Con cambios pendientes pide confirmación antes de descartar. */
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
            this.event.set(created);
            this.isCreateMode.set(false);
            this._restoreReadMode();
            this.isSaving.set(false);
            this.router.navigate(['/director/events', created.internalId], { replaceUrl: true });
          },
          error: (err: unknown) =>
            this._handleSaveError(err, 'No se pudo crear el evento. Por favor, intenta nuevamente.'),
        });
      } else {
        this.directorApi.updateEvent(ev!.internalId, payload).subscribe({
          next: (updated) => {
            this.event.set(updated);
            this.isSaving.set(false);
            this._restoreReadMode();
          },
          error: (err: unknown) =>
            this._handleSaveError(err, 'No se pudieron guardar los cambios. Por favor, intenta nuevamente.'),
        });
      }
    });
  }

  addPhoto(): void {
    this.photosArray.push(this.fb.control(''));
    this.form.markAsDirty();
  }

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

      this.loading.set(true);
      this.directorApi.deleteEvent(ev.internalId).subscribe({
        next: () => this.router.navigate(['/director/events']),
        error: (err: unknown) => {
          console.error('Error al eliminar evento:', err);
          this.error.set(
            bffErrorMessage(err, `No se pudo eliminar el evento "${ev.title}". Por favor, intenta nuevamente.`),
          );
          this.loading.set(false);
        },
      });
    });
  }

  /** Los nombres coinciden con `EventWrite` para que `fieldError.field` apunte al control. */
  private _buildForm(): FormGroup {
    const off = <T>(value: T) => ({ value, disabled: true });
    const required = Validators.required;

    return this.fb.group({
      internalId:             [off(''), required],
      title:                  [off(''), required],
      type:                   [off<string | null>(null), required],
      sportId:                [off<number | null>(null)],
      eventDate:              [off<Date | null>(null), [required, this._startAfterEnd()]],
      startTime:              [off<Date | null>(null), required],
      endDate:                [off<Date | null>(null), [required, this._endBeforeStart('endDate')]],
      endTime:                [off<Date | null>(null), [required, this._endBeforeStart('endTime')]],
      status:                 [off(''), required],
      isOfficial:             [off(false)],
      location:               [off('')],
      address:                [off('')],
      description:            [off(''), required],
      descriptionOpt:         [off('')],
      coverImage:             [off(''), required],
      photos:                 this.fb.array([]),
      organizerInstitutionId: [off<number | null>(null)],
      organizerCampusId:      [off<number | null>(null)],
      organizerTeamId:        [off<number | null>(null)],
      teamOneInstitutionId:   [off<number | null>(null)],
      teamOneCampusId:        [off<number | null>(null)],
      teamOneId:              [off<number | null>(null)],
      teamTwoInstitutionId:   [off<number | null>(null)],
      teamTwoCampusId:        [off<number | null>(null)],
      teamTwoId:              [off<number | null>(null), this._matchupValidator()],
      delegateOid:            [off<string | null>(null)],
    });
  }

  private _watchForm(): void {
    const get = (name: string) => this.form.get(name)!;
    const until = takeUntilDestroyed<unknown>(this.destroyRef);

    get('type').valueChanges.pipe(until).subscribe((type) => {
      this.typeValue.set(type as string | null);
      this._applyTypeRules();
    });
    get('sportId').valueChanges.pipe(until).subscribe((id) => this.sportValue.set(id as number | null));
    get('delegateOid').valueChanges.pipe(until).subscribe((oid) => this.delegateValue.set(oid as string | null));

    merge(
      get('eventDate').valueChanges,
      get('startTime').valueChanges,
      get('endDate').valueChanges,
      get('endTime').valueChanges,
    )
      .pipe(until)
      .subscribe(() => {
        get('eventDate').updateValueAndValidity({ emitEvent: false });
        get('endDate').updateValueAndValidity({ emitEvent: false });
        get('endTime').updateValueAndValidity({ emitEvent: false });
      });

    get('teamOneId').valueChanges.pipe(until).subscribe(() =>
      get('teamTwoId').updateValueAndValidity({ emitEvent: false }),
    );
  }

  private _applyTypeRules(): void {
    const matchup = this.requiresMatchup();
    this._setRequired('sportId', matchup);
    this._setRequired('delegateOid', matchup);
    MATCHUP_FIELDS.forEach((name) => this._setRequired(name, matchup));
    ORGANIZER_REQUIRED.forEach((name) => this._setRequired(name, this.hasType() && !matchup));
    this.form.get('teamTwoId')?.updateValueAndValidity({ emitEvent: false });
  }

  private _setRequired(name: string, required: boolean): void {
    const control = this.form.get(name);
    if (!control) return;
    if (required && !control.hasValidator(Validators.required)) {
      control.addValidators(Validators.required);
    } else if (!required && control.hasValidator(Validators.required)) {
      control.removeValidators(Validators.required);
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private _startAfterEnd(): ValidatorFn {
    return (control) => {
      const start = asLocalIsoDate(control.value);
      const end = asLocalIsoDate(control.parent?.get('endDate')?.value);
      return start && end && start > end ? { startAfterEnd: true } : null;
    };
  }

  /** Marca endDate si es otro día, endTime si es el mismo. */
  private _endBeforeStart(field: 'endDate' | 'endTime'): ValidatorFn {
    return (control) => {
      const group = control.parent;
      if (!group) return null;
      const value = (name: string) => group.get(name)?.value;
      const wrong = endBeforeStartField(
        asLocalIsoDate(value('eventDate')),
        asLocalTime(value('startTime')),
        asLocalIsoDate(value('endDate')),
        asLocalTime(value('endTime')),
      );
      return wrong === field ? { endBeforeStart: true } : null;
    };
  }

  /** Ni el mismo equipo ni otra división. */
  private _matchupValidator(): ValidatorFn {
    return (control) => {
      if (!control.parent || control.value === null || !this.requiresMatchup()) return null;
      if (control.value === control.parent.get('teamOneId')?.value) return { sameTeam: true };

      const one = this.teamOneSelected();
      const two = this.teamTwoSelected();
      const comparable = one?.division && two?.division && two.id === control.value;
      return comparable && one!.division !== two!.division ? { divisionMismatch: true } : null;
    };
  }

  private _loadEventTypes(): void {
    this.catalog.getEventTypes().subscribe({
      next: (types) => {
        this.eventTypes.set(types);
        this._applyTypeRules();
      },
      error: () => this.eventTypes.set([]),
    });
  }

  private _loadCatalogs(): void {
    if (this.catalogsRequested) return;
    this.catalogsRequested = true;

    this.catalog.getSports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: () => this.sportsError.set(true),
    });

    // El dropdown de delegados no pasa por el BFF: se arma desde Graph.
    // TEMPORAL (solo desarrollo): lee Graph desde el navegador del director y
    // expone a todo el directorio; ver la advertencia en DevDelegatesService.
    this.devDelegates.getDelegates().subscribe({
      next: (delegates) => {
        this.delegates.set(delegates);
        this.delegatesLoaded.set(true);
      },
      error: () => this.delegatesError.set('No se pudo cargar la lista de delegados.'),
    });
  }

  private _handleSaveError(err: unknown, message: string): void {
    console.error('Error al guardar evento:', err);
    this.isSaving.set(false);
    this.error.set(bffErrorMessage(err, message));
    if (bffFieldErrorCode(err, 'type') === 'MATCH_NOT_ALLOWED') {
      const type = this.form.get('type');
      type?.setErrors({ matchNotAllowed: true });
      type?.markAsTouched();
    }
  }

  private _restoreReadMode(): void {
    const ev = this.event();
    if (ev) this._patchForm(ev);
    this.form.disable();
    this.photosArray.controls.forEach((c) => c.disable());
    this.form.markAsPristine();
    this.isEdit.set(false);
  }

  /** Trae todas las claves; las del bloque que no aplica van en `null`. */
  private _buildPayload(): EventWrite {
    const raw = this.form.getRawValue();
    const matchup = this.requiresMatchup();
    const id = (name: string): number | null => raw[name] ?? null;
    const matchupId = (name: string) => (matchup ? id(name) : null);
    const organizerId = (name: string) => (matchup ? null : id(name));
    const text = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

    const original = this.event();
    const internalId = this.isCreateMode()
      ? String(raw.internalId ?? '').trim()
      : (original?.internalId ?? raw.internalId ?? '');

    const delegate = this.delegateOptions().find((d) => d.oid === raw.delegateOid) ?? null;

    return {
      internalId,
      title: raw.title,
      description: raw.description,
      descriptionOpt: text(raw.descriptionOpt),
      type: raw.type,
      status: raw.status,
      isOfficial: !!raw.isOfficial,
      eventDate: asLocalIsoDate(raw.eventDate) ?? '',
      startTime: asLocalTime(raw.startTime) ?? '',
      endDate: asLocalIsoDate(raw.endDate) ?? '',
      endTime: asLocalTime(raw.endTime) ?? '',
      location: text(raw.location),
      address: text(raw.address),
      coverImage: raw.coverImage,
      photos: (this.photosArray.getRawValue() as string[]).filter((u) => u.trim() !== ''),
      sportId: id('sportId'),
      organizerInstitutionId: organizerId('organizerInstitutionId'),
      organizerCampusId: organizerId('organizerCampusId'),
      organizerTeamId: organizerId('organizerTeamId'),
      teamOneInstitutionId: matchupId('teamOneInstitutionId'),
      teamOneCampusId: matchupId('teamOneCampusId'),
      teamOneId: matchupId('teamOneId'),
      teamTwoInstitutionId: matchupId('teamTwoInstitutionId'),
      teamTwoCampusId: matchupId('teamTwoCampusId'),
      teamTwoId: matchupId('teamTwoId'),
      delegateOid: delegate?.oid ?? null,
      delegateDisplayName: delegate?.displayName ?? null,
    };
  }

  private _patchForm(ev: DirectorEvent): void {
    const photosArray = this.form.get('photos') as FormArray;
    photosArray.clear();
    (ev.photos ?? []).forEach((url) => {
      photosArray.push(this.fb.control({ value: url, disabled: true }));
    });

    this.form.patchValue({
      internalId:             ev.internalId ?? '',
      title:                  ev.title,
      type:                   ev.type ?? null,
      sportId:                ev.sport?.id ?? null,
      eventDate:              parseLocalIsoDate(ev.eventDate),
      startTime:              parseLocalTime(ev.startTime),
      endDate:                parseLocalIsoDate(ev.endDate),
      endTime:                parseLocalTime(ev.endTime),
      status:                 ev.status,
      isOfficial:             ev.isOfficial,
      location:               ev.location ?? '',
      address:                ev.address ?? '',
      description:            ev.description ?? '',
      descriptionOpt:         ev.descriptionOpt ?? '',
      coverImage:             ev.coverImage ?? '',
      organizerInstitutionId: ev.organizer?.institution?.id ?? null,
      organizerCampusId:      ev.organizer?.campus?.id ?? null,
      organizerTeamId:        ev.organizer?.team?.id ?? null,
      teamOneInstitutionId:   ev.teamOne?.institution?.id ?? null,
      teamOneCampusId:        ev.teamOne?.campus?.id ?? null,
      teamOneId:              ev.teamOne?.id ?? null,
      teamTwoInstitutionId:   ev.teamTwo?.institution?.id ?? null,
      teamTwoCampusId:        ev.teamTwo?.campus?.id ?? null,
      teamTwoId:              ev.teamTwo?.id ?? null,
      delegateOid:            ev.delegate?.oid ?? null,
    });
    this._applyTypeRules();
  }
}
