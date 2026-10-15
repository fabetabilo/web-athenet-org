import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { missingMatchData } from '../../competition-status';

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
  /** Con la copa en curso, un partido completo no puede perder datos (`409`). */
  protected readonly published =
    this.data.competition.status === 'IN_PROGRESS' && missingMatchData(this.match).length === 0;

  protected readonly form = this.fb.group({
    date: [parseLocalIsoDate(this.match.date), this.published ? Validators.required : []],
    time: [parseLocalTime(this.match.time), this.published ? Validators.required : []],
    location: [this.match.location ?? ''],
    address: [this.match.address ?? ''],
    homeTeamId: [this.match.homeTeam?.id ?? (null as number | null)],
    awayTeamId: [this.match.awayTeam?.id ?? (null as number | null)],
    delegateOid: [this.match.delegate?.oid ?? (null as string | null), this.published ? Validators.required : []],
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
