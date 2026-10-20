import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, type ValidatorFn } from '@angular/forms';
import { merge } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

import { ButtonComponent } from '../../../../../shared/components/button/button';
import {
  asLocalIsoDate,
  asLocalTime,
  endBeforeStartField,
  parseLocalIsoDate,
  parseLocalTime,
} from '../../../../../shared/utils/local-date';
import { DirectorCompetitionApiService } from '../../../services/director-competition-api.service';
import { DevDelegatesService } from '../../../services/dev-delegates.service';
import {
  competitionErrorMessage,
  type CompetitionTeam,
  type Delegate,
  type DirectorCompetition,
  type DirectorMatch,
  type MatchWrite,
} from '../../../services/bff';
import { controlErrorMessage } from '../../../events/event-detail/control-error';
import { withSelected } from '../../../events/event-detail/team-picker/team-picker';

export interface MatchFormDialogData {
  competition: DirectorCompetition;
  match: DirectorMatch;
  /** Nómina de la copa: opciones del sorteo. */
  roster: CompetitionTeam[];
  /** Llave completa, para no repetir equipos en octavos. */
  matches: DirectorMatch[];
}

@Component({
  selector: 'app-match-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatIconModule,
    ButtonComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './match-form-dialog.html',
  styleUrl: './match-form-dialog.scss',
})
export class MatchFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MatchFormDialogComponent, DirectorMatch>);
  private readonly competitionApi = inject(DirectorCompetitionApiService);
  // TEMPORAL (solo desarrollo): ver advertencia en DevDelegatesService.
  private readonly devDelegates = inject(DevDelegatesService);
  private readonly fb = inject(FormBuilder);
  protected readonly data = inject<MatchFormDialogData>(MAT_DIALOG_DATA);

  private readonly match = this.data.match;
  /** El sorteo solo existe en octavos y con la copa en borrador. */
  protected readonly drawEditable =
    this.data.competition.status === 'DRAFT' && this.match.round === 'ROUND_OF_16';

  protected readonly form = this.fb.group({
    date: [parseLocalIsoDate(this.match.date)],
    time: [parseLocalTime(this.match.time)],
    endDate: [parseLocalIsoDate(this.match.endDate), endBeforeStart('endDate')],
    endTime: [parseLocalTime(this.match.endTime), endBeforeStart('endTime')],
    location: [this.match.location ?? ''],
    address: [this.match.address ?? ''],
    homeTeamId: [this.match.homeTeam?.id ?? (null as number | null)],
    awayTeamId: [this.match.awayTeam?.id ?? (null as number | null)],
    delegateOid: [this.match.delegate?.oid ?? (null as string | null)],
  });

  private readonly homeValue = toSignal(this.form.controls.homeTeamId.valueChanges, {
    initialValue: this.form.controls.homeTeamId.value,
  });
  private readonly awayValue = toSignal(this.form.controls.awayTeamId.valueChanges, {
    initialValue: this.form.controls.awayTeamId.value,
  });

  /** Equipos ya sorteados en otro partido de octavos. */
  private readonly drawnElsewhere = new Set(
    this.data.matches
      .filter((m) => m.round === 'ROUND_OF_16' && m.id !== this.match.id)
      .flatMap((m) => [m.homeTeam?.id, m.awayTeam?.id])
      .filter((id): id is number => id != null),
  );

  protected readonly homeOptions = computed(() => this.drawOptions(this.awayValue()));
  protected readonly awayOptions = computed(() => this.drawOptions(this.homeValue()));

  private readonly delegates = signal<Delegate[]>([]);
  protected readonly delegatesError = signal(false);
  protected readonly delegateOptions = computed(() =>
    withSelected(this.delegates(), this.match.delegate, (d) => d.oid),
  );

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fieldError = (name: string) => controlErrorMessage(this.form.get(name));

  constructor() {
    this.devDelegates.getDelegates().subscribe({
      next: (delegates) => this.delegates.set(delegates),
      error: () => this.delegatesError.set(true),
    });

    const { date, time, endDate, endTime } = this.form.controls;
    const revalidateEnd = () => {
      endDate.updateValueAndValidity({ emitEvent: false });
      endTime.updateValueAndValidity({ emitEvent: false });
    };
    revalidateEnd();
    merge(date.valueChanges, time.valueChanges, endDate.valueChanges, endTime.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(revalidateEnd);
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
    const delegate = this.delegateOptions().find((d) => d.oid === raw.delegateOid) ?? null;
    // Fuera del sorteo los equipos se envían tal como vienen: si cambian, el BFF responde 409.
    const payload: MatchWrite = {
      date: asLocalIsoDate(raw.date),
      time: asLocalTime(raw.time),
      location: raw.location?.trim() || null,
      address: raw.address?.trim() || null,
      homeTeamId: this.drawEditable ? raw.homeTeamId : (this.match.homeTeam?.id ?? null),
      awayTeamId: this.drawEditable ? raw.awayTeamId : (this.match.awayTeam?.id ?? null),
      delegateOid: delegate?.oid ?? null,
      delegateDisplayName: delegate?.displayName ?? null,
      endDate: asLocalIsoDate(raw.endDate),
      endTime: asLocalTime(raw.endTime),
    };

    this.saving.set(true);
    this.error.set(null);
    this.competitionApi.updateMatch(this.data.competition.id, this.match.id, payload).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.dialogRef.close(saved);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(competitionErrorMessage(err, 'No se pudo guardar el encuentro.'));
      },
    });
  }

  private drawOptions(otherSide: number | null): CompetitionTeam[] {
    return this.data.roster.filter((t) => !this.drawnElsewhere.has(t.teamId) && t.teamId !== otherSide);
  }
}

/** Marca endDate si es otro día, endTime si es el mismo. */
function endBeforeStart(field: 'endDate' | 'endTime'): ValidatorFn {
  return (control) => {
    const group = control.parent;
    if (!group) return null;
    const value = (name: string) => group.get(name)?.value;
    const wrong = endBeforeStartField(
      asLocalIsoDate(value('date')),
      asLocalTime(value('time')),
      asLocalIsoDate(value('endDate')),
      asLocalTime(value('endTime')),
    );
    return wrong === field ? { endBeforeStart: true } : null;
  };
}
