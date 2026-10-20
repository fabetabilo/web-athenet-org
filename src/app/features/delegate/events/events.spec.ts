import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DelegateEventsComponent } from './events';
import { DelegateApiService } from '../services/delegate-api.service';
import { NotificationService } from '../../../shared/services/notification.service';
import type { DelegateMatch } from '../services/delegate-bff';

describe('DelegateEventsComponent', () => {
  /** Partido de octavos ya programado, con la forma de lectura del BFF. */
  const SCHEDULED: DelegateMatch = {
    id: 7,
    competition: { id: 1, name: 'Copa Instituciones de Chile 2026', competitionImg: null },
    round: 'ROUND_OF_16',
    roundLabel: 'Octavos de final',
    date: '2026-10-24',
    time: '18:00',
    location: 'Estadio USACH',
    address: null,
    homeTeam: { id: 100, name: 'USACH Fútbol Varones', logoUrl: null },
    awayTeam: { id: 200, name: 'U. de Chile Fútbol Varones', logoUrl: null },
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    scheduleConfirmed: true,
  };
  const IN_PROGRESS: DelegateMatch = { ...SCHEDULED, id: 8, status: 'IN_PROGRESS' };
  const FINISHED: DelegateMatch = { ...SCHEDULED, id: 9, status: 'FINISHED', homeScore: 2, awayScore: 1 };
  /** Cuartos: el rival todavía no sale de octavos. */
  const INCOMPLETE: DelegateMatch = {
    ...SCHEDULED,
    id: 10,
    round: 'QUARTER_FINAL',
    roundLabel: 'Cuartos de final',
    awayTeam: null,
    time: null,
  };

  let fixture: ComponentFixture<DelegateEventsComponent>;
  let component: DelegateEventsComponent;
  let apiMock: { getMatches: any; startMatch: any };
  let dialogMock: { open: any };
  let notificationMock: { success: any; error: any };
  let routerMock: { navigate: any };

  const text = () => fixture.nativeElement.textContent as string;
  const cards = () => Array.from(fixture.nativeElement.querySelectorAll('.match-card')) as HTMLElement[];
  const buttonIn = (card: HTMLElement, label: string) =>
    Array.from(card.querySelectorAll('app-button'))
      .find((b) => b.textContent?.includes(label))
      ?.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    apiMock = {
      getMatches: vi.fn().mockReturnValue(of([SCHEDULED, IN_PROGRESS, FINISHED, INCOMPLETE])),
      startMatch: vi.fn().mockReturnValue(of({ ...SCHEDULED, status: 'IN_PROGRESS' })),
    };
    dialogMock = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    notificationMock = { success: vi.fn(), error: vi.fn() };
    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DelegateEventsComponent],
      providers: [
        provideAnimations(),
        { provide: DelegateApiService, useValue: apiMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DelegateEventsComponent);
    component = fixture.componentInstance;
  });

  it('debe agrupar los partidos por estado, con los en juego primero', () => {
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.section-title')).map((h: any) =>
      h.textContent.trim(),
    );
    expect(titles).toEqual(['En juego (1)', 'Programados (2)', 'Finalizados (1)']);
    expect(cards().length).toBe(4);
  });

  it('debe mostrar equipos, fecha, lugar, "Por definir" y el resultado finalizado', () => {
    fixture.detectChanges();

    expect(text()).toContain('USACH Fútbol Varones');
    expect(text()).toContain('24/10/2026 18:00');
    expect(text()).toContain('Estadio USACH');
    expect(text()).toContain('Por definir');
    expect(text()).toContain('2 - 1');
  });

  it('debe mostrar el estado vacío si no tiene partidos', () => {
    apiMock.getMatches.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.state-box')).not.toBeNull();
    expect(text()).toContain('No tienes partidos asignados en copas en curso');
  });

  it('debe ofrecer reintentar ante un 503', () => {
    apiMock.getMatches.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-banner')).not.toBeNull();
    apiMock.getMatches.mockReturnValue(of([SCHEDULED]));
    fixture.nativeElement.querySelector('.retry-btn').click();
    fixture.detectChanges();

    expect(apiMock.getMatches).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.error-banner')).toBeNull();
    expect(cards().length).toBe(1);
  });

  it('debe deshabilitar "Iniciar" si falta un equipo, la fecha o la hora', () => {
    fixture.detectChanges();

    const incompleteCard = cards().find((c) => c.textContent?.includes('Cuartos de final'))!;
    expect(incompleteCard.textContent).toContain('Falta equipos, hora');
    expect(buttonIn(incompleteCard, 'Iniciar').disabled).toBe(true);
  });

  it('debe iniciar tras confirmar y reemplazar solo esa tarjeta', () => {
    fixture.detectChanges();

    const card = cards().find((c) => c.textContent?.includes('Programado') && c.textContent?.includes('USACH'))!;
    buttonIn(card, 'Iniciar').click();
    fixture.detectChanges();

    expect(dialogMock.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: expect.objectContaining({ title: 'Iniciar encuentro' }) }),
    );
    expect(apiMock.startMatch).toHaveBeenCalledWith(7);
    expect(apiMock.getMatches).toHaveBeenCalledTimes(1);
    expect(component['matches']().find((m) => m.id === 7)?.status).toBe('IN_PROGRESS');
    expect(notificationMock.success).toHaveBeenCalled();
  });

  it('no debe iniciar si se cancela la confirmación', () => {
    dialogMock.open.mockReturnValue({ afterClosed: () => of(false) });
    fixture.detectChanges();

    component.onStart(SCHEDULED);
    expect(apiMock.startMatch).not.toHaveBeenCalled();
  });

  it('debe mostrar el message del backend si iniciar falla', () => {
    apiMock.startMatch.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'CONFLICT', message: 'El partido ya fue iniciado', fieldErrors: [] },
          }),
      ),
    );
    fixture.detectChanges();

    component.onStart(SCHEDULED);
    expect(notificationMock.error).toHaveBeenCalledWith('El partido ya fue iniciado');
    expect(component['matches']().find((m) => m.id === 7)?.status).toBe('SCHEDULED');
  });

  it('debe abrir el tablero del partido', () => {
    fixture.detectChanges();

    const liveCard = cards().find((c) => c.textContent?.includes('Abrir tablero'))!;
    buttonIn(liveCard, 'Abrir tablero').click();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/delegate/events', 8]);
  });
});
