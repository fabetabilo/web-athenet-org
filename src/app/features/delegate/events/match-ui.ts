import type { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog';
import type { DelegateMatch, MatchTeamRef } from '../services/delegate-bff';

/** `null`: el equipo llega desde la ronda anterior. Sin `name`: ms-institutions no respondió. */
export function teamName(team: MatchTeamRef | null): string {
  if (!team) return 'Por definir';
  return team.name ?? 'Equipo sin nombre';
}

export function matchupLabel(match: DelegateMatch): string {
  return `${teamName(match.homeTeam)} vs ${teamName(match.awayTeam)}`;
}

/** Iniciar no tiene vuelta atrás: ms-competitions no permite volver a SCHEDULED. */
export function startConfirmData(match: DelegateMatch): ConfirmDialogData {
  return {
    title: 'Iniciar encuentro',
    message: '¿Confirmas el inicio de',
    targetName: matchupLabel(match),
    description: 'Una vez iniciado no se puede volver atrás. El resultado se registra al finalizar.',
    confirmText: 'Iniciar',
    confirmVariant: 'primary',
    confirmIcon: 'play_arrow',
    variant: 'warning',
    icon: 'sports',
  };
}

/** `true` solo si la persona confirma; cerrar o cancelar emite `false`. */
export function openConfirm(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
  return dialog
    .open(ConfirmDialogComponent, {
      data: { cancelText: 'Cancelar', ...data },
      width: '460px',
      maxWidth: '92vw',
      panelClass: 'athenet-dialog-panel',
    })
    .afterClosed()
    .pipe(map((confirmed) => confirmed === true));
}
