import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';

import {
  TableComponent,
  TableCellDirective,
  type TableColumn,
} from '../../../../shared/components/table/table';
import { PillComponent } from '../../../../shared/components/pill/pill';
import { ButtonComponent } from '../../../../shared/components/button/button';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../../shared/services/notification.service';
import { DirectorCompetitionApiService } from '../../services/director-competition-api.service';
import {
  competitionErrorMessage,
  isRetryableBffError,
  type CompetitionTeam,
  type DirectorCompetition,
  type DirectorMatch,
} from '../../services/bff';
import { COMPETITION_STATUS, CUP_SIZE, MATCH_STATUS, missingMatchData } from '../competition-status';
import {
  CompetitionFormDialogComponent,
  type CompetitionFormDialogData,
} from '../competition-form-dialog/competition-form-dialog';
import { EnrollTeamDialogComponent, type EnrollTeamDialogData } from './enroll-team-dialog/enroll-team-dialog';
import { MatchFormDialogComponent, type MatchFormDialogData } from './match-form-dialog/match-form-dialog';

const MATCHES_TAB = 1;

@Component({
  selector: 'app-competition-detail',
  standalone: true,
  imports: [
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    TableComponent,
    TableCellDirective,
    PillComponent,
    ButtonComponent,
  ],
  templateUrl: './competition-detail.html',
  styleUrl: './competition-detail.scss',
})
export class CompetitionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly competitionApi = inject(DirectorCompetitionApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly competition = signal<DirectorCompetition | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly canRetryLoad = signal(false);
  protected readonly imgBroken = signal(false);
  protected readonly busy = signal(false);

  protected readonly teams = signal<CompetitionTeam[]>([]);
  protected readonly teamsLoading = signal(false);
  protected readonly teamsError = signal<string | null>(null);

  protected readonly matches = signal<DirectorMatch[]>([]);
  protected readonly matchesLoading = signal(false);
  protected readonly matchesError = signal<string | null>(null);

  protected readonly status = COMPETITION_STATUS;
  protected readonly matchStatus = MATCH_STATUS;
  protected readonly cupSize = CUP_SIZE;
  protected readonly missing = missingMatchData;

  protected readonly isDraft = computed(() => this.competition()?.status === 'DRAFT');
  protected readonly rosterFull = computed(() => this.teams().length >= CUP_SIZE);
  protected readonly drawReady = computed(() => {
    const roundOf16 = this.matches().filter((m) => m.round === 'ROUND_OF_16');
    return roundOf16.length === CUP_SIZE / 2 && roundOf16.every((m) => m.homeTeam && m.awayTeam);
  });
  protected readonly canStart = computed(() => this.isDraft() && this.rosterFull() && this.drawReady());

  /** La lista ya viene ordenada por ronda y posición. */
  protected readonly rounds = computed(() => {
    const groups: { label: string; matches: DirectorMatch[] }[] = [];
    for (const match of this.matches()) {
      const last = groups.at(-1);
      if (last?.label === match.roundLabel) last.matches.push(match);
      else groups.push({ label: match.roundLabel, matches: [match] });
    }
    return groups;
  });

  protected readonly teamColumns: TableColumn<CompetitionTeam>[] = [
    { key: 'logoUrl', header: 'Logo', width: '80px' },
    { key: 'name', header: 'Equipo', sortable: true, filterable: true, filterType: 'text' },
    { key: 'institution.name', header: 'Institución', sortable: true, filterable: true, filterType: 'select' },
    { key: 'actions', header: 'Acciones', width: '100px', align: 'center', stickyEnd: true },
  ];

  protected readonly matchColumns: TableColumn<DirectorMatch>[] = [
    { key: 'position', header: 'Ronda', width: '190px' },
    { key: 'homeTeam', header: 'Local / Visita' },
    { key: 'date', header: 'Fecha y hora', width: '150px' },
    { key: 'location', header: 'Lugar', width: '160px' },
    { key: 'delegate', header: 'Delegado', width: '150px' },
    { key: 'status', header: 'Estado', width: '150px' },
    { key: 'homeScore', header: 'Resultado', width: '100px', align: 'center' },
    { key: 'actions', header: 'Acciones', width: '90px', align: 'center', stickyEnd: true },
  ];

  protected readonly trackTeam = (_: number, team: CompetitionTeam) => team.teamId;

  ngOnInit(): void {
    this.loadCompetition();
  }

  loadCompetition(): void {
    this.loading.set(true);
    this.error.set(null);
    this.canRetryLoad.set(false);

    this.competitionApi.getCompetition(this.id).subscribe({
      next: (competition) => {
        this.competition.set(competition);
        this.loading.set(false);
        this.loadTeams();
        this.loadMatches();
      },
      error: (err: unknown) => {
        console.error('Error al cargar competencia:', err);
        this.error.set(competitionErrorMessage(err, 'No se pudo cargar la copa.'));
        this.canRetryLoad.set(isRetryableBffError(err));
        this.loading.set(false);
      },
    });
  }

  loadTeams(): void {
    this.teamsLoading.set(true);
    this.teamsError.set(null);
    this.competitionApi.getTeams(this.id).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.teamsLoading.set(false);
      },
      error: (err: unknown) => {
        this.teamsError.set(competitionErrorMessage(err, 'No se pudo cargar la nómina.'));
        this.teamsLoading.set(false);
      },
    });
  }

  /** Los equipos de cuartos en adelante cambian cuando el delegado finaliza partidos. */
  loadMatches(): void {
    this.matchesLoading.set(true);
    this.matchesError.set(null);
    this.competitionApi.getMatches(this.id).subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.matchesLoading.set(false);
      },
      error: (err: unknown) => {
        this.matchesError.set(competitionErrorMessage(err, 'No se pudieron cargar los encuentros.'));
        this.matchesLoading.set(false);
      },
    });
  }

  onTabChange(index: number): void {
    if (index === MATCHES_TAB) this.loadMatches();
  }

  onBack(): void {
    this.router.navigate(['/director/competitions']);
  }

  onEdit(): void {
    const competition = this.competition();
    if (!competition) return;

    const ref = this.dialog.open<CompetitionFormDialogComponent, CompetitionFormDialogData, DirectorCompetition>(
      CompetitionFormDialogComponent,
      {
        data: { competition, hasTeams: this.teams().length > 0 },
        width: '600px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    ref.afterClosed().subscribe((updated) => {
      if (!updated) return;
      this.competition.set(updated);
      this.imgBroken.set(false);
      this.notification.success('Copa actualizada.');
    });
  }

  onDelete(): void {
    const competition = this.competition();
    if (!competition) return;

    this.confirm({
      title: 'Confirmación de Eliminación',
      message: 'Estás a punto de eliminar la copa',
      targetName: competition.name,
      description: 'Se eliminarán su nómina y su llave de partidos. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      confirmVariant: 'danger',
      confirmIcon: 'delete',
      variant: 'danger',
      icon: 'delete_outline',
    }, () => {
      this.busy.set(true);
      this.competitionApi.deleteCompetition(competition.id).subscribe({
        next: () => {
          this.notification.success('Copa eliminada.');
          this.router.navigate(['/director/competitions']);
        },
        error: (err: unknown) => this.actionFailed(err, 'No se pudo eliminar la copa.'),
      });
    });
  }

  onStart(): void {
    const competition = this.competition();
    if (!competition || !this.canStart()) return;

    this.confirm({
      title: 'Iniciar copa',
      message: '¿Confirmas el inicio de',
      targetName: competition.name,
      description: 'Después del inicio el sorteo ya no se puede cambiar.',
      confirmText: 'Iniciar copa',
      confirmVariant: 'primary',
      confirmIcon: 'play_arrow',
      variant: 'warning',
      icon: 'flag',
    }, () => {
      this.busy.set(true);
      this.competitionApi.startCompetition(competition.id).subscribe({
        next: (started) => {
          this.competition.set(started);
          this.busy.set(false);
          this.notification.success('Copa iniciada.');
          this.loadMatches();
        },
        error: (err: unknown) => this.actionFailed(err, 'No se pudo iniciar la copa.'),
      });
    });
  }

  onEnrollTeam(): void {
    const competition = this.competition();
    if (!competition || this.rosterFull()) return;

    const ref = this.dialog.open<EnrollTeamDialogComponent, EnrollTeamDialogData, CompetitionTeam>(
      EnrollTeamDialogComponent,
      {
        data: { competition, enrolledIds: this.teams().map((t) => t.teamId) },
        width: '760px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    ref.afterClosed().subscribe((team) => {
      if (!team) return;
      this.teams.update((prev) => [...prev, team]);
      this.notification.success(`${team.name} inscrito en la copa.`);
    });
  }

  onRemoveTeam(team: CompetitionTeam): void {
    this.confirm({
      title: 'Quitar equipo',
      message: 'Estás a punto de quitar de la copa a',
      targetName: team.name,
      description: 'Si el equipo ya está en el sorteo, primero hay que sacarlo de su partido de octavos.',
      confirmText: 'Quitar',
      confirmVariant: 'danger',
      confirmIcon: 'person_remove',
      variant: 'danger',
      icon: 'group_remove',
    }, () => {
      this.busy.set(true);
      this.competitionApi.removeTeam(this.id, team.teamId).subscribe({
        next: () => {
          this.teams.update((prev) => prev.filter((t) => t.teamId !== team.teamId));
          this.busy.set(false);
          this.notification.success(`${team.name} quitado de la copa.`);
        },
        error: (err: unknown) => this.actionFailed(err, 'No se pudo quitar el equipo.'),
      });
    });
  }

  protected canEditMatch(match: DirectorMatch): boolean {
    return this.competition()?.status !== 'FINISHED' && match.status === 'SCHEDULED';
  }

  onEditMatch(match: DirectorMatch): void {
    const competition = this.competition();
    if (!competition || !this.canEditMatch(match)) return;

    const ref = this.dialog.open<MatchFormDialogComponent, MatchFormDialogData, DirectorMatch>(
      MatchFormDialogComponent,
      {
        data: { competition, match, roster: this.teams(), matches: this.matches() },
        width: '640px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      },
    );

    ref.afterClosed().subscribe((saved) => {
      if (!saved) return;
      this.notification.success('Encuentro guardado.');
      this.loadMatches();
    });
  }

  private confirm(data: ConfirmDialogData, onConfirm: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { cancelText: 'Cancelar', ...data },
        width: '460px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) onConfirm();
      });
  }

  private actionFailed(err: unknown, fallback: string): void {
    console.error(fallback, err);
    this.busy.set(false);
    this.notification.error(competitionErrorMessage(err, fallback));
  }
}
