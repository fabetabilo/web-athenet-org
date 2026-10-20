import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { PillComponent } from '../../../../shared/components/pill/pill';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { NotificationService } from '../../../../shared/services/notification.service';
import { isRetryableBffError } from '../../../director/services/bff';
import { MATCH_STATUS } from '../../../director/competitions/competition-status';
import { DelegateApiService } from '../../services/delegate-api.service';
import { delegateErrorMessage, missingToStart, type DelegateMatch } from '../../services/delegate-bff';
import { clearScoreDraft, loadScoreDraft, saveScoreDraft } from '../../services/score-draft';
import { openConfirm, startConfirmData, teamName } from '../match-ui';

export type ScoreSide = 'home' | 'away';

/**
 * Tablero del encuentro. El marcador solo se envía al finalizar (o al guardar
 * una corrección); mientras está en juego vive en `score-draft`.
 */
@Component({
  selector: 'app-match-board',
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, MatIconModule, PillComponent, ButtonComponent],
  templateUrl: './match-board.html',
  styleUrl: './match-board.scss',
})
export class MatchBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DelegateApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly match = signal<DelegateMatch | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly canRetry = signal(false);
  protected readonly notFound = signal(false);
  protected readonly busy = signal(false);
  protected readonly correcting = signal(false);

  protected readonly home = signal(0);
  protected readonly away = signal(0);

  protected readonly status = MATCH_STATUS;
  protected readonly teamName = teamName;

  protected readonly missing = computed(() => {
    const match = this.match();
    return match ? missingToStart(match) : [];
  });
  protected readonly tied = computed(() => this.home() === this.away());
  /** Los botones +/- solo aparecen en juego o al corregir. */
  protected readonly editable = computed(() => this.match()?.status === 'IN_PROGRESS' || this.correcting());
  protected readonly unchanged = computed(() => {
    const match = this.match();
    return !!match && this.home() === match.homeScore && this.away() === match.awayScore;
  });

  ngOnInit(): void {
    this.loadMatch();
  }

  loadMatch(): void {
    this.loading.set(true);
    this.error.set(null);
    this.canRetry.set(false);
    this.notFound.set(false);

    this.api.getMatch(this.id).subscribe({
      next: (match) => {
        this.loading.set(false);
        if (match) this.show(match);
        else this.notFound.set(true);
      },
      error: (err: unknown) => {
        console.error('Error al cargar el encuentro:', err);
        this.error.set(delegateErrorMessage(err, 'No se pudo cargar el encuentro.'));
        this.canRetry.set(isRetryableBffError(err));
        this.loading.set(false);
      },
    });
  }

  onBack(): void {
    this.router.navigate(['/delegate/events']);
  }

  change(side: ScoreSide, delta: 1 | -1): void {
    const match = this.match();
    if (!match || !this.editable() || this.busy()) return;

    const score = side === 'home' ? this.home : this.away;
    score.set(Math.max(0, score() + delta));
    // Una corrección se hace en el momento; solo el partido en juego necesita sobrevivir a una recarga.
    if (!this.correcting()) saveScoreDraft(match.id, { home: this.home(), away: this.away() });
  }

  onStart(): void {
    const match = this.match();
    if (!match || match.status !== 'SCHEDULED' || this.missing().length || this.busy()) return;

    openConfirm(this.dialog, startConfirmData(match)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.busy.set(true);
      this.api.startMatch(match.id).subscribe({
        next: (started) => {
          this.busy.set(false);
          this.show(started);
          this.notification.success('Encuentro iniciado. Ya puedes llevar el marcador.');
        },
        error: (err: unknown) => this.actionFailed(err, 'No se pudo iniciar el encuentro.'),
      });
    });
  }

  onFinish(): void {
    const match = this.match();
    if (!match || match.status !== 'IN_PROGRESS' || this.tied() || this.busy()) return;

    openConfirm(this.dialog, {
      title: 'Finalizar encuentro',
      message: '¿Confirmas el resultado final',
      targetName: this.scoreLabel(match),
      description: 'El ganador pasa a la ronda siguiente. Después solo podrás corregir el resultado.',
      confirmText: 'Finalizar',
      confirmVariant: 'primary',
      confirmIcon: 'sports_score',
      variant: 'warning',
      icon: 'flag',
    }).subscribe((confirmed) => {
      if (confirmed) this.submitResult(match, 'Encuentro finalizado.', 'No se pudo finalizar el encuentro.');
    });
  }

  onCorrect(): void {
    if (this.match()?.status === 'FINISHED') this.correcting.set(true);
  }

  onCancelCorrection(): void {
    const match = this.match();
    if (!match || this.busy()) return;
    this.correcting.set(false);
    this.setScore(match.homeScore ?? 0, match.awayScore ?? 0);
  }

  onSaveCorrection(): void {
    const match = this.match();
    if (!match || !this.correcting() || this.tied() || this.unchanged() || this.busy()) return;

    openConfirm(this.dialog, {
      title: 'Corregir resultado',
      message: '¿Confirmas el nuevo resultado',
      targetName: this.scoreLabel(match),
      description: 'Si cambia el ganador y el partido siguiente ya comenzó, no se podrá guardar.',
      confirmText: 'Guardar corrección',
      confirmVariant: 'primary',
      confirmIcon: 'save',
      variant: 'warning',
      icon: 'edit',
    }).subscribe((confirmed) => {
      if (confirmed) this.submitResult(match, 'Resultado corregido.', 'No se pudo corregir el resultado.');
    });
  }

  /** Si falla, el marcador se queda como está para reintentar. */
  private submitResult(match: DelegateMatch, success: string, fallback: string): void {
    this.busy.set(true);
    this.api.registerResult(match.id, { homeScore: this.home(), awayScore: this.away() }).subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.show(saved);
        this.notification.success(success);
      },
      error: (err: unknown) => this.actionFailed(err, fallback),
    });
  }

  /** Ubica el marcador según el estado que confirmó el backend. */
  private show(match: DelegateMatch): void {
    this.match.set(match);
    this.correcting.set(false);

    if (match.status === 'IN_PROGRESS') {
      const draft = loadScoreDraft(match.id);
      this.setScore(draft?.home ?? 0, draft?.away ?? 0);
    } else if (match.status === 'FINISHED') {
      clearScoreDraft(match.id);
      this.setScore(match.homeScore ?? 0, match.awayScore ?? 0);
    } else {
      this.setScore(0, 0);
    }
  }

  private setScore(home: number, away: number): void {
    this.home.set(home);
    this.away.set(away);
  }

  private scoreLabel(match: DelegateMatch): string {
    return `${teamName(match.homeTeam)} ${this.home()} - ${this.away()} ${teamName(match.awayTeam)}`;
  }

  private actionFailed(err: unknown, fallback: string): void {
    console.error(fallback, err);
    this.busy.set(false);
    this.notification.error(delegateErrorMessage(err, fallback));
  }
}
