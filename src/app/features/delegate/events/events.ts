import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { PillComponent } from '../../../shared/components/pill/pill';
import { ButtonComponent } from '../../../shared/components/button/button';
import { NotificationService } from '../../../shared/services/notification.service';
import { isRetryableBffError } from '../../director/services/bff';
import { MATCH_STATUS } from '../../director/competitions/competition-status';
import { DelegateApiService } from '../services/delegate-api.service';
import {
  delegateErrorMessage,
  missingToStart,
  type DelegateMatch,
  type MatchStatus,
} from '../services/delegate-bff';
import { openConfirm, startConfirmData, teamName } from './match-ui';

/** En juego primero: es lo que el delegado tiene entre manos. */
const SECTIONS: { status: MatchStatus; title: string }[] = [
  { status: 'IN_PROGRESS', title: 'En juego' },
  { status: 'SCHEDULED', title: 'Programados' },
  { status: 'FINISHED', title: 'Finalizados' },
];

@Component({
  selector: 'app-delegate-events',
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, MatIconModule, PillComponent, ButtonComponent],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class DelegateEventsComponent implements OnInit {
  private readonly api = inject(DelegateApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly matches = signal<DelegateMatch[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly canRetry = signal(false);
  /** Partido que se está iniciando. */
  protected readonly busyId = signal<number | null>(null);

  protected readonly status = MATCH_STATUS;
  protected readonly missing = missingToStart;
  protected readonly teamName = teamName;

  /** Cada sección conserva el orden por fecha y hora que manda el backend. */
  protected readonly sections = computed(() =>
    SECTIONS.map((section) => ({
      ...section,
      matches: this.matches().filter((m) => m.status === section.status),
    })).filter((section) => section.matches.length > 0),
  );

  ngOnInit(): void {
    this.loadMatches();
  }

  loadMatches(): void {
    this.loading.set(true);
    this.error.set(null);
    this.canRetry.set(false);

    this.api.getMatches().subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al cargar los encuentros del delegado:', err);
        this.error.set(delegateErrorMessage(err, 'No se pudieron cargar tus encuentros.'));
        this.canRetry.set(isRetryableBffError(err));
        this.loading.set(false);
      },
    });
  }

  onOpen(match: DelegateMatch): void {
    this.router.navigate(['/delegate/events', match.id]);
  }

  onStart(match: DelegateMatch): void {
    if (this.busyId() !== null || missingToStart(match).length) return;

    openConfirm(this.dialog, startConfirmData(match)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.busyId.set(match.id);
      this.api.startMatch(match.id).subscribe({
        next: (started) => {
          this.matches.update((list) => list.map((m) => (m.id === started.id ? started : m)));
          this.busyId.set(null);
          this.notification.success('Encuentro iniciado. Abre el tablero para llevar el marcador.');
        },
        error: (err: unknown) => {
          console.error('Error al iniciar el encuentro:', err);
          this.busyId.set(null);
          this.notification.error(delegateErrorMessage(err, 'No se pudo iniciar el encuentro.'));
        },
      });
    });
  }
}
