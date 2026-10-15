import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DirectorEventsComponent } from './events';
import { DirectorApiService } from '../services/director-api.service';
import type { DirectorEvent } from '../services/bff';

describe('DirectorEventsComponent', () => {
  /** Partido que cruza la medianoche, con la forma de lectura del BFF. */
  const MATCH_EVENT: DirectorEvent = {
    internalId: 'EVT-42',
    title: 'Clásico universitario de fútbol',
    description: 'Final del torneo interuniversitario.',
    descriptionOpt: null,
    type: 'MATCH',
    status: 'PUBLISHED',
    isOfficial: true,
    eventDate: '2026-10-24',
    startTime: '22:00',
    endDate: '2026-10-25',
    endTime: '00:30',
    location: 'Estadio USACH',
    address: null,
    coverImage: 'https://example.com/cover.jpg',
    photos: [],
    sport: { id: 3, name: 'Fútbol' },
    organizer: null,
    teamOne: {
      id: 100,
      name: 'USACH Fútbol Varones',
      division: 'MASCULINO',
      campus: { id: 10, name: 'Casa Central' },
      institution: { id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' },
    },
    teamTwo: {
      id: 200,
      name: 'U. de Chile Fútbol Varones',
      division: 'MASCULINO',
      campus: { id: 20, name: 'Campus Juan Gómez Millas' },
      institution: { id: 2, name: 'Universidad de Chile', acronym: 'UCH' },
    },
    delegate: { oid: '3f2b9c1e-5a7d-4c1b-9e2f-1d0a8b6c4e21', displayName: 'María Pérez' },
    competitionId: null,
    competitionMatchId: null,
  };

  /** Jornada de varios días, sin deporte, organizada por una institución. */
  const TRACKDAY_EVENT: DirectorEvent = {
    ...MATCH_EVENT,
    internalId: 'EVT-43',
    title: 'Jornada de pista de primavera',
    type: 'TRACKDAY',
    status: 'DRAFT',
    isOfficial: false,
    eventDate: '2026-11-06',
    startTime: '09:00',
    endDate: '2026-11-08',
    endTime: '18:00',
    sport: null,
    organizer: {
      institution: { id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' },
      campus: { id: 10, name: 'Casa Central' },
      team: null,
    },
    teamOne: null,
    teamTwo: null,
    delegate: null,
  };

  let component: DirectorEventsComponent;
  let fixture: ComponentFixture<DirectorEventsComponent>;
  let apiServiceMock: { getEvents: any; deleteEvent: any };
  let dialogMock: { open: any };
  let routerMock: { navigate: any };

  // Un partido de fútbol y una jornada sin deporte, con la forma del contrato del BFF.
  const mockEvents: DirectorEvent[] = [
    { ...MATCH_EVENT, internalId: 'EVT-1', title: 'Campeonato Sudamericano' },
    { ...TRACKDAY_EVENT, internalId: 'EVT-2', title: 'Copa Femenina' },
  ];

  beforeEach(async () => {
    routerMock = {
      navigate: vi.fn(),
    };

    apiServiceMock = {
      getEvents: vi.fn().mockReturnValue(of(mockEvents)),
      deleteEvent: vi.fn().mockReturnValue(of(undefined)),
    };

    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DirectorEventsComponent],
      providers: [
        provideAnimations(),
        { provide: Router, useValue: routerMock },
        { provide: DirectorApiService, useValue: apiServiceMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectorEventsComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y llamar a getEvents() al inicializar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(apiServiceMock.getEvents).toHaveBeenCalledTimes(1);
    expect(component['events']().length).toBe(2);
    expect(component['loading']()).toBe(false);
    expect(component['error']()).toBeNull();
  });

  it('debe renderizar filas en la tabla cuando getEvents() responde con éxito', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
    expect(rows.length).toBe(2);
  });

  it('debe mostrar banner de error cuando getEvents() falla y permitir reintento', () => {
    apiServiceMock.getEvents.mockReturnValue(
      throwError(() => new Error('Connection refused')),
    );

    fixture.detectChanges();

    expect(component['loading']()).toBe(false);
    expect(component['error']()).not.toBeNull();
    expect(component['events']().length).toBe(0);

    const errorBanner = fixture.nativeElement.querySelector('.error-banner');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner.textContent).toContain('No se pudo conectar con el servidor');

    // Simula reintento exitoso
    apiServiceMock.getEvents.mockReturnValue(of(mockEvents));
    const retryBtn = fixture.nativeElement.querySelector('.retry-btn');
    expect(retryBtn).not.toBeNull();
    retryBtn.click();
    fixture.detectChanges();

    expect(apiServiceMock.getEvents).toHaveBeenCalledTimes(2);
    expect(component['error']()).toBeNull();
    expect(component['events']().length).toBe(2);
  });

  it('debe mostrar el deporte del catálogo y "Sin deporte" cuando no tiene', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fútbol');
    expect(text).toContain('Sin deporte');
  });

  it('debe mostrar la hora de inicio y el día de término cuando es otro día', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('24/10/2026 22:00');
    expect(text).toContain('→ 25/10');
  });

  it('debe renderizar el botón "+ Nuevo Evento" y responder al click', () => {
    fixture.detectChanges();
    const newEventBtn = fixture.nativeElement.querySelector('app-button');
    expect(newEventBtn).toBeTruthy();
    expect(newEventBtn.textContent).toContain('Nuevo Evento');

    const onCreateSpy = vi.spyOn(component, 'onCreateEvent');
    newEventBtn.click();
    expect(onCreateSpy).toHaveBeenCalledTimes(1);
  });

  describe('onDelete', () => {
    it('debe abrir el diálogo de confirmación con los datos del evento', () => {
      fixture.detectChanges();
      const targetEvent = mockEvents[0];

      component.onDelete(targetEvent);

      expect(dialogMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Confirmación de Eliminación',
            targetName: targetEvent.title,
            confirmVariant: 'danger',
          }),
        }),
      );
    });

    it('debe llamar a deleteEvent y actualizar la lista cuando el usuario confirma', () => {
      fixture.detectChanges();
      const targetEvent = mockEvents[0];
      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onDelete(targetEvent);

      expect(apiServiceMock.deleteEvent).toHaveBeenCalledWith(targetEvent.internalId);
      expect(component['events']().length).toBe(1);
      expect(component['events']()[0].internalId).toBe('EVT-2');
    });

    it('no debe llamar a deleteEvent si el usuario cancela en el diálogo', () => {
      fixture.detectChanges();
      const targetEvent = mockEvents[0];
      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(false)),
      });

      component.onDelete(targetEvent);

      expect(apiServiceMock.deleteEvent).not.toHaveBeenCalled();
      expect(component['events']().length).toBe(2);
    });

    it('debe registrar error si deleteEvent falla', () => {
      fixture.detectChanges();
      const targetEvent = mockEvents[0];
      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });
      apiServiceMock.deleteEvent.mockReturnValue(
        throwError(() => new Error('Forbidden')),
      );

      component.onDelete(targetEvent);

      expect(component['error']()).toContain(`No se pudo eliminar el evento "${targetEvent.title}"`);
      expect(component['events']().length).toBe(2);
    });
  });
});
