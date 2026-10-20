import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ButtonComponent } from '../../../../../shared/components/button/button';
import { DirectorCompetitionApiService } from '../../../services/director-competition-api.service';
import { EventCatalogService } from '../../../services/event-catalog.service';
import {
  competitionErrorMessage,
  type CompetitionTeam,
  type DirectorCompetition,
} from '../../../services/bff';
import { TeamPickerComponent } from '../../../events/event-detail/team-picker/team-picker';

export interface EnrollTeamDialogData {
  competition: DirectorCompetition;
  enrolledIds: number[];
}

@Component({
  selector: 'app-enroll-team-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule, ButtonComponent, TeamPickerComponent],
  providers: [EventCatalogService],
  templateUrl: './enroll-team-dialog.html',
  styleUrl: './enroll-team-dialog.scss',
})
export class EnrollTeamDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EnrollTeamDialogComponent, CompetitionTeam>);
  private readonly competitionApi = inject(DirectorCompetitionApiService);
  private readonly fb = inject(FormBuilder);
  protected readonly data = inject<EnrollTeamDialogData>(MAT_DIALOG_DATA);

  private readonly notEnrolled: ValidatorFn = (control) =>
    this.data.enrolledIds.includes(control.value) ? { alreadyEnrolled: true } : null;

  protected readonly form = this.fb.group({
    institutionId: [null as number | null, Validators.required],
    campusId: [null as number | null, Validators.required],
    teamId: [null as number | null, [Validators.required, this.notEnrolled]],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

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

    this.saving.set(true);
    this.error.set(null);
    this.competitionApi.enrollTeam(this.data.competition.id, this.form.getRawValue().teamId as number).subscribe({
      next: (team) => {
        this.saving.set(false);
        this.dialogRef.close(team);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(competitionErrorMessage(err, 'No se pudo inscribir el equipo.'));
      },
    });
  }
}
