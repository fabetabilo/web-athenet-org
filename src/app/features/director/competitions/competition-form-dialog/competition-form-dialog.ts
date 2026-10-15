import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { asLocalIsoDate, parseLocalIsoDate } from '../../../../shared/utils/local-date';
import { DirectorCompetitionApiService } from '../../services/director-competition-api.service';
import { EventCatalogService } from '../../services/event-catalog.service';
import {
  competitionErrorMessage,
  type CompetitionWrite,
  type DirectorCompetition,
  type SportOption,
  type SportRef,
} from '../../services/bff';
import { controlErrorMessage } from '../../events/event-detail/control-error';
import { withSelected } from '../../events/event-detail/team-picker/team-picker';

export interface CompetitionFormDialogData {
  /** Presente al editar. */
  competition?: DirectorCompetition;
  /** Con equipos inscritos el deporte no se puede cambiar (`409`). */
  hasTeams?: boolean;
}

const endDateNotBeforeStart: ValidatorFn = (control) => {
  const start = asLocalIsoDate(control.parent?.get('startDate')?.value);
  const end = asLocalIsoDate(control.value);
  return start && end && end < start ? { endDateBeforeStart: true } : null;
};

@Component({
  selector: 'app-competition-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    ButtonComponent,
  ],
  providers: [EventCatalogService, provideNativeDateAdapter()],
  templateUrl: './competition-form-dialog.html',
  styleUrl: './competition-form-dialog.scss',
})
export class CompetitionFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CompetitionFormDialogComponent, DirectorCompetition>);
  private readonly competitionApi = inject(DirectorCompetitionApiService);
  private readonly catalog = inject(EventCatalogService);
  private readonly fb = inject(FormBuilder);
  private readonly data = inject<CompetitionFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  private readonly competition = this.data.competition ?? null;
  protected readonly isEdit = !!this.competition;
  protected readonly sportLocked = !!this.data.hasTeams;

  protected readonly form = this.fb.group({
    name: [this.competition?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    sportId: [
      { value: this.competition?.sport.id ?? (null as number | null), disabled: this.sportLocked },
      Validators.required,
    ],
    season: [this.competition?.season ?? '', [Validators.required, Validators.maxLength(20)]],
    description: [this.competition?.description ?? ''],
    competitionImg: [this.competition?.competitionImg ?? '', [Validators.required, Validators.maxLength(500)]],
    startDate: [parseLocalIsoDate(this.competition?.startDate)],
    endDate: [parseLocalIsoDate(this.competition?.endDate), endDateNotBeforeStart],
  });

  private readonly sports = signal<SportOption[]>([]);
  protected readonly sportsError = signal(false);
  protected readonly sportOptions = computed(() =>
    withSelected<SportRef>(this.sports(), this.competition?.sport, (s) => s.id),
  );

  protected readonly imgUrl = toSignal(
    this.form.controls.competitionImg.valueChanges.pipe(map((v) => (v ?? '').trim())),
    { initialValue: (this.competition?.competitionImg ?? '').trim() },
  );
  protected readonly imgBroken = signal(false);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fieldError = (name: string) => controlErrorMessage(this.form.get(name));

  constructor() {
    this.catalog.getSports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: () => this.sportsError.set(true),
    });
  }

  onStartDateChange(): void {
    this.form.controls.endDate.updateValueAndValidity();
  }

  onCancel(): void {
    if (this.saving()) return;
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CompetitionWrite = {
      name: (raw.name ?? '').trim(),
      sportId: raw.sportId as number,
      season: (raw.season ?? '').trim(),
      description: raw.description?.trim() || null,
      competitionImg: (raw.competitionImg ?? '').trim(),
      startDate: asLocalIsoDate(raw.startDate),
      endDate: asLocalIsoDate(raw.endDate),
    };

    this.saving.set(true);
    this.error.set(null);

    const request$ = this.competition
      ? this.competitionApi.updateCompetition(this.competition.id, payload)
      : this.competitionApi.createCompetition(payload);

    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.dialogRef.close(saved);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          competitionErrorMessage(
            err,
            this.isEdit ? 'No se pudo guardar la copa.' : 'No se pudo crear la copa.',
          ),
        );
      },
    });
  }
}
