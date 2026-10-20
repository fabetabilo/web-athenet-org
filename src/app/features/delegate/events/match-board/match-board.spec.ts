import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatchBoardComponent } from './match-board';
import { DelegateApiService } from '../../services/delegate-api.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { loadScoreDraft, saveScoreDraft } from '../../services/score-draft';
import type { DelegateMatch } from '../../services/delegate-bff';

describe('MatchBoardComponent', () => {
  const SCHEDULED: DelegateMatch = {
    id: 7,
    competition: { id: 1, name: 'Copa Instituciones de Chile 2026', competitionImg: null },
    round: 'ROUND_OF_16',
    roundLabel: 'Octavos de final',
    date: '2026-10-24',
    time: '18:00',
    location: 'Estadio USACH',
    address: 'Av. Ecuador 3650',
    homeTeam: { id: 100, name: 'USACH', logoUrl: null },
    awayTeam: { id: 200, name: 'UCH', logoUrl: null },
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    scheduleConfirmed: true,
  };
  const IN_PROGRESS: DelegateMatch = { ...SCHEDULED, status: 'IN_PROGRESS' };
  const FINISHED: DelegateMatch = { ...SCHEDULED, status: 'FINISHED', homeScore: 2, awayScore: 1 };

  let fixture: ComponentFixture<MatchBoardComponent>;
  let component: MatchBoardComponent;
  let apiMock: { getMatch: any; startMatch: any; registerResult: any };
  let dialogMock: { open: any };
  let notificationMock: { success: any; error: any };
  let routerMock: { navigate: any };

  const text = () => fixture.nativeElement.textContent as string;
  const scores = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.score-value')).map((s: any) => s.textContent.trim());
  const button = (label: string) =>
    (Array.from(fixture.nativeElement.querySelectorAll('app-button')) as HTMLElement[])
      .find((b) => b.textContent?.includes(label))
      ?.querySelector('button') as HTMLButtonElement | undefined;
  const scoreButton = (label: string) =>
    fixture.nativeElement.querySelector(`.score-btn[aria-label="${label}"]`) as HTMLButtonElement | null;

  function setup(match: DelegateMatch | null): void {
    apiMock.getMatch.mockReturnValue(of(match));
    fixture = TestBed.createComponent(MatchBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function press(label: string, times = 1): void {
    for (let i = 0; i < times; i++) scoreButton(label)!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    apiMock = {
      getMatch: vi.fn(),
      startMatch: vi.fn().mockReturnValue(of(IN_PROGRESS)),
      registerResult: vi.fn(),
    };
    dialogMock = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    notificationMock = { success: vi.fn(), error: vi.fn() };
    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MatchBoardComponent],
      providers: [
        provideAnimations(),
        { provide: DelegateApiService, useValue: apiMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('debe cargar el partido de la ruta con su detalle', () => {
    setup(SCHEDULED);

    expect(apiMock.getMatch).toHaveBeenCalledWith(7);
    expect(text()).toContain('Copa Instituciones de Chile 2026');
    expect(text()).toContain('Octavos de final');
    expect(text()).toContain('Av. Ecuador 3650');
  });

  it('debe avisar si el partido no existe o no está asignado', () => {
    setup(null);

    expect(text()).toContain('Partido no encontrado o no está asignado a ti');
    button('Volver a Mis eventos')!.click();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/delegate/events']);
  });

  it('debe ofrecer reintentar si la carga falla con 503', () => {
    apiMock.getMatch.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    fixture = TestBed.createComponent(MatchBoardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-banner')).not.toBeNull();
    apiMock.getMatch.mockReturnValue(of(SCHEDULED));
    fixture.nativeElement.querySelector('.retry-btn').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error-banner')).toBeNull();
  });

  describe('programado', () => {
    it('no debe permitir tocar el marcador', () => {
      setup(SCHEDULED);
      expect(fixture.nativeElement.querySelector('.score-btn')).toBeNull();
      expect(scores()).toEqual(['–', '–']);
    });

    it('debe iniciar tras confirmar y habilitar el marcador', () => {
      setup(SCHEDULED);

      button('Iniciar encuentro')!.click();
      fixture.detectChanges();

      expect(apiMock.startMatch).toHaveBeenCalledWith(7);
      expect(scores()).toEqual(['0', '0']);
      expect(scoreButton('Sumar gol a USACH')).not.toBeNull();
    });

    it('debe deshabilitar "Iniciar" si falta el rival', () => {
      setup({ ...SCHEDULED, awayTeam: null });

      expect(text()).toContain('Falta equipos');
      expect(button('Iniciar encuentro')!.disabled).toBe(true);
    });

    it('debe deshabilitar "Iniciar" hasta que el director confirme la programación', () => {
      setup({ ...SCHEDULED, scheduleConfirmed: false });

      expect(text()).toContain('Falta confirmación del director');
      expect(button('Iniciar encuentro')!.disabled).toBe(true);
    });
  });

  describe('en juego', () => {
    it('debe sumar y restar goles, sin bajar de 0, y guardar el borrador', () => {
      setup(IN_PROGRESS);

      expect(scoreButton('Restar gol a USACH')!.disabled).toBe(true);
      press('Sumar gol a USACH', 3);
      press('Restar gol a USACH');
      press('Sumar gol a UCH');

      expect(scores()).toEqual(['2', '1']);
      expect(loadScoreDraft(7)).toEqual({ home: 2, away: 1 });
    });

    it('debe restaurar el borrador al volver a abrir el partido', () => {
      saveScoreDraft(7, { home: 3, away: 2 });
      setup(IN_PROGRESS);

      expect(scores()).toEqual(['3', '2']);
    });

    it('debe deshabilitar "Finalizar" con empate', () => {
      setup(IN_PROGRESS);

      expect(button('Finalizar encuentro')!.disabled).toBe(true);
      expect(text()).toContain('No se admiten empates');
    });

    it('debe finalizar con el marcador, borrar el borrador y quedar finalizado', () => {
      apiMock.registerResult.mockReturnValue(of(FINISHED));
      setup(IN_PROGRESS);
      press('Sumar gol a USACH', 2);
      press('Sumar gol a UCH');

      button('Finalizar encuentro')!.click();
      fixture.detectChanges();

      expect(dialogMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: expect.objectContaining({ targetName: 'USACH 2 - 1 UCH' }) }),
      );
      expect(apiMock.registerResult).toHaveBeenCalledWith(7, { homeScore: 2, awayScore: 1 });
      expect(loadScoreDraft(7)).toBeNull();
      expect(text()).toContain('Resultado final registrado');
      expect(fixture.nativeElement.querySelector('.score-btn')).toBeNull();
    });

    it('debe conservar el marcador y el borrador si finalizar falla', () => {
      apiMock.registerResult.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
      setup(IN_PROGRESS);
      press('Sumar gol a UCH');

      button('Finalizar encuentro')!.click();
      fixture.detectChanges();

      expect(notificationMock.error).toHaveBeenCalled();
      expect(scores()).toEqual(['0', '1']);
      expect(loadScoreDraft(7)).toEqual({ home: 0, away: 1 });
      expect(button('Finalizar encuentro')).toBeDefined();
    });
  });

  describe('finalizado', () => {
    it('debe precargar el resultado al corregir y restaurarlo al cancelar', () => {
      setup(FINISHED);
      expect(scores()).toEqual(['2', '1']);

      button('Corregir resultado')!.click();
      fixture.detectChanges();
      expect(button('Guardar corrección')!.disabled).toBe(true);

      press('Restar gol a USACH', 2);
      expect(scores()).toEqual(['0', '1']);
      expect(button('Guardar corrección')!.disabled).toBe(false);
      // Una corrección no deja borrador.
      expect(loadScoreDraft(7)).toBeNull();

      button('Cancelar')!.click();
      fixture.detectChanges();
      expect(scores()).toEqual(['2', '1']);
      expect(fixture.nativeElement.querySelector('.score-btn')).toBeNull();
    });

    it('debe guardar la corrección con el nuevo marcador', () => {
      apiMock.registerResult.mockReturnValue(of({ ...FINISHED, homeScore: 0, awayScore: 1 }));
      setup(FINISHED);

      button('Corregir resultado')!.click();
      fixture.detectChanges();
      press('Restar gol a USACH', 2);
      button('Guardar corrección')!.click();
      fixture.detectChanges();

      expect(apiMock.registerResult).toHaveBeenCalledWith(7, { homeScore: 0, awayScore: 1 });
      expect(notificationMock.success).toHaveBeenCalledWith('Resultado corregido.');
      expect(scores()).toEqual(['0', '1']);
    });

    it('debe mostrar el 409 si el partido siguiente ya comenzó', () => {
      const message = 'El partido siguiente ya comenzó: no se puede cambiar el ganador';
      apiMock.registerResult.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'CONFLICT', message, fieldErrors: [] } })),
      );
      setup(FINISHED);

      button('Corregir resultado')!.click();
      fixture.detectChanges();
      press('Restar gol a USACH', 2);
      button('Guardar corrección')!.click();
      fixture.detectChanges();

      expect(notificationMock.error).toHaveBeenCalledWith(message);
      expect(component['correcting']()).toBe(true);
    });
  });
});
