import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EventDetailComponent } from './event-detail';
import { DirectorApiService } from '../../services/director-api.service';
import { EventCatalogService } from '../../services/event-catalog.service';
import { DevDelegatesService } from '../../services/dev-delegates.service';
import type { Campus, EventRead, EventType, Institution, Sport, Team } from '../../services/bff';

describe('EventDetailComponent', () => {
  /** Partido que cruza la medianoche, con la forma de lectura del BFF. */
  const MATCH_EVENT: EventRead = {
    id: 42,
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
  };

  /** Jornada de varios días, sin deporte, organizada por una institución. */
  const TRACKDAY_EVENT: EventRead = {
    ...MATCH_EVENT,
    id: 43,
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

  const SPORTS: Sport[] = [
    { id: 1, name: 'Básquetbol' },
    { id: 3, name: 'Fútbol' },
  ];
  const EVENT_TYPES: EventType[] = [
    { code: 'MATCH', label: 'Partido', requiresMatchup: true },
    { code: 'MEETING', label: 'Reunión', requiresMatchup: false },
    { code: 'TRACKDAY', label: 'Jornada de Pista', requiresMatchup: false },
  ];
  const INSTITUTIONS: Institution[] = [
    { id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' },
    { id: 2, name: 'Universidad de Chile', acronym: 'UCH' },
  ];
  const CAMPUSES: Campus[] = [
    { id: 10, name: 'Casa Central' },
    { id: 11, name: 'Campus Estación Central' },
    { id: 20, name: 'Campus Juan Gómez Millas' },
  ];
  const TEAMS: Team[] = [
    { id: 100, name: 'USACH Fútbol Varones', division: 'MASCULINO' },
    { id: 101, name: 'USACH Fútbol Damas', division: 'FEMENINO' },
    { id: 200, name: 'U. de Chile Fútbol Varones', division: 'MASCULINO' },
  ];

  let component: EventDetailComponent;
  let fixture: ComponentFixture<EventDetailComponent>;

  let paramMapSubject: BehaviorSubject<any>;
  let routerMock: { navigate: any };
  let dialogMock: { open: any };
  let directorApiMock: {
    getEventByInternalId: any;
    createEvent: any;
    updateEvent: any;
    deleteEvent: any;
  };
  let catalogMock: {
    getEventTypes: any;
    getSports: any;
    getInstitutions: any;
    getCampuses: any;
    getTeams: any;
  };
  let devDelegatesMock: { getDelegates: any };

  const DELEGATES = [
    { oid: '3f2b9c1e-5a7d-4c1b-9e2f-1d0a8b6c4e21', displayName: 'María Pérez' },
    { oid: '0a1b2c3d-0000-4000-8000-000000000002', displayName: 'Pedro Soto' },
  ];

  const mockEvent: EventRead = {
    ...MATCH_EVENT,
    photos: ['https://example.com/photo1.jpg'],
  };

  const form = () => component['form'];
  const ctrl = (name: string) => form().get(name)!;

  function setupTestBed(initialInternalId: string = 'EVT-42', apiError: boolean = false) {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ internalId: initialInternalId }));

    routerMock = { navigate: vi.fn() };
    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      }),
    };

    directorApiMock = {
      getEventByInternalId: vi.fn().mockImplementation(() =>
        apiError ? throwError(() => new Error('Error 500')) : of(mockEvent),
      ),
      createEvent: vi.fn().mockImplementation((body) => of({ ...mockEvent, internalId: body.internalId })),
      updateEvent: vi.fn().mockReturnValue(of({ ...mockEvent, title: 'Título Actualizado' })),
      deleteEvent: vi.fn().mockReturnValue(of(undefined)),
    };

    catalogMock = {
      getEventTypes: vi.fn().mockReturnValue(of(EVENT_TYPES)),
      getSports: vi.fn().mockReturnValue(of(SPORTS)),
      getInstitutions: vi.fn().mockReturnValue(of(INSTITUTIONS)),
      getCampuses: vi.fn().mockReturnValue(of(CAMPUSES)),
      getTeams: vi.fn().mockReturnValue(of(TEAMS)),
    };

    devDelegatesMock = { getDelegates: vi.fn().mockReturnValue(of(DELEGATES)) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [EventDetailComponent],
      providers: [
        provideAnimations(),
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject.asObservable() } },
        { provide: Router, useValue: routerMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: DirectorApiService, useValue: directorApiMock },
        { provide: DevDelegatesService, useValue: devDelegatesMock },
      ],
    });
    // El catálogo se provee en el propio componente: se reemplaza ahí.
    TestBed.overrideComponent(EventDetailComponent, {
      set: { providers: [{ provide: EventCatalogService, useValue: catalogMock }] },
    });

    fixture = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
  }

  /** Datos mínimos válidos comunes a cualquier tipo de evento. */
  function fillCommon(): void {
    form().patchValue({
      internalId: 'EVT-NUEVO',
      title: 'Nuevo Evento Válido',
      description: 'Descripción',
      status: 'DRAFT',
      isOfficial: true,
      coverImage: 'https://example.com/cover.jpg',
      eventDate: new Date(2026, 9, 24),
      startTime: new Date(2026, 9, 24, 22, 0),
      endDate: new Date(2026, 9, 25),
      endTime: new Date(2026, 9, 25, 0, 30),
    });
  }

  function fillMatch(): void {
    fillCommon();
    form().patchValue({
      type: 'MATCH',
      sportId: 3,
      teamOneInstitutionId: 1,
      teamOneCampusId: 10,
      teamOneId: 100,
      teamTwoInstitutionId: 2,
      teamTwoCampusId: 20,
      teamTwoId: 200,
      delegateOid: DELEGATES[0].oid,
    });
  }

  describe('Modo Lectura (Carga de evento existente)', () => {
    beforeEach(async () => {
      setupTestBed('EVT-42');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('debe crearse y llamar a getEventByInternalId al inicializar', () => {
      expect(component).toBeTruthy();
      expect(directorApiMock.getEventByInternalId).toHaveBeenCalledWith('EVT-42');
      expect(component['event']()).toEqual(mockEvent);
      expect(component['isCreateMode']()).toBe(false);
      expect(component['isEdit']()).toBe(false);
      expect(component['loading']()).toBe(false);
    });

    it('debe aplanar la lectura anidada en los controles y mantenerlos deshabilitados', () => {
      expect(form().disabled).toBe(true);
      expect(ctrl('internalId').value).toBe('EVT-42');
      expect(ctrl('sportId').value).toBe(3);
      expect(ctrl('teamOneInstitutionId').value).toBe(1);
      expect(ctrl('teamOneCampusId').value).toBe(10);
      expect(ctrl('teamOneId').value).toBe(100);
      expect(ctrl('teamTwoId').value).toBe(200);
      expect(ctrl('organizerInstitutionId').value).toBeNull();
      expect(ctrl('delegateOid').value).toBe(DELEGATES[0].oid);
      expect(component.photosArray.length).toBe(1);
    });

    it('debe mostrar la fecha y la hora locales, sin el desfase de UTC', () => {
      const eventDate = ctrl('eventDate').value as Date;
      const startTime = ctrl('startTime').value as Date;
      expect(eventDate.getDate()).toBe(24);
      expect(startTime.getHours()).toBe(22);
      expect((ctrl('endDate').value as Date).getDate()).toBe(25);
    });

    it('no debe pedir catálogos en modo lectura: los nombres salen del GET', () => {
      expect(catalogMock.getSports).not.toHaveBeenCalled();
      expect(catalogMock.getInstitutions).not.toHaveBeenCalled();
      expect(catalogMock.getCampuses).not.toHaveBeenCalled();
      expect(catalogMock.getTeams).not.toHaveBeenCalled();
      expect(devDelegatesMock.getDelegates).not.toHaveBeenCalled();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Fútbol');
      expect(text).toContain('USACH Fútbol Varones');
      expect(text).toContain('Campus Juan Gómez Millas');
      expect(text).toContain('María Pérez');
    });

    it('debe mostrar el enfrentamiento en un partido y no la sección de organizador', () => {
      const titles = Array.from(fixture.nativeElement.querySelectorAll('.section-title')).map(
        (el: any) => el.textContent.trim(),
      );
      expect(titles).toContain('Enfrentamiento');
      expect(titles).not.toContain('Organizador');
      expect(titles).not.toContain('Datos Internos');
      expect(fixture.nativeElement.querySelectorAll('app-team-picker').length).toBe(2);
    });

    it('debe mostrar los botones de Editar y Eliminar en la barra de herramientas', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      const texts = Array.from(buttons).map((b: any) => b.textContent.trim());
      expect(texts.some((t: string) => t.includes('Editar'))).toBe(true);
      expect(texts.some((t: string) => t.includes('Eliminar'))).toBe(true);
    });

    it('debe manejar error cuando getEventByInternalId falla', () => {
      setupTestBed('EVT-ERROR', true);
      fixture.detectChanges();

      expect(component['loading']()).toBe(false);
      expect(component['error']()).toContain('No se pudo cargar el evento');
      expect(fixture.nativeElement.querySelector('.error-banner')).toBeTruthy();
    });
  });

  describe('Evento que no es partido', () => {
    beforeEach(() => {
      setupTestBed('EVT-43');
      directorApiMock.getEventByInternalId.mockReturnValue(of(TRACKDAY_EVENT));
      fixture.detectChanges();
    });

    it('debe mostrar el organizador y no el enfrentamiento', () => {
      expect(component['requiresMatchup']()).toBe(false);
      expect(ctrl('organizerInstitutionId').value).toBe(1);
      expect(ctrl('organizerCampusId').value).toBe(10);
      expect(ctrl('sportId').value).toBeNull();

      const titles = Array.from(fixture.nativeElement.querySelectorAll('.section-title')).map(
        (el: any) => el.textContent.trim(),
      );
      expect(titles).toContain('Organizador');
      expect(titles).not.toContain('Enfrentamiento');
    });
  });

  describe('Modo Creación (internalId === "new")', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('debe inicializarse en modo creación y edición con formulario habilitado', () => {
      expect(component['isCreateMode']()).toBe(true);
      expect(component['isEdit']()).toBe(true);
      expect(form().enabled).toBe(true);
      expect(ctrl('internalId').enabled).toBe(true);
      expect(directorApiMock.getEventByInternalId).not.toHaveBeenCalled();
    });

    it('debe cargar deportes, tipos y delegados para los selects', () => {
      expect(catalogMock.getEventTypes).toHaveBeenCalledTimes(1);
      expect(catalogMock.getSports).toHaveBeenCalledTimes(1);
      expect(devDelegatesMock.getDelegates).toHaveBeenCalledTimes(1);
      expect(component['sportOptions']()).toEqual(SPORTS);
      expect(component['delegateOptions']()).toEqual(DELEGATES);
    });

    it('debe renderizar el botón "Crear Evento"', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      const texts = Array.from(buttons).map((b: any) => b.textContent.trim());
      expect(texts.some((t: string) => t.includes('Crear Evento'))).toBe(true);
    });

    it('debe avisar en el campo de delegado si la carga falla, sin romper el formulario', () => {
      setupTestBed('new');
      devDelegatesMock.getDelegates.mockReturnValue(throwError(() => new Error('Graph caído')));
      fixture.detectChanges();

      expect(component['delegatesError']()).toContain('No se pudo cargar la lista de delegados');
      expect(component['isEdit']()).toBe(true);
    });
  });

  describe('Validación de Formulario', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('debe marcar los controles como touched y no abrir diálogo si el formulario está vacío', () => {
      component.onSave();

      expect(form().invalid).toBe(true);
      for (const name of ['internalId', 'title', 'type', 'eventDate', 'startTime', 'endDate', 'endTime', 'status', 'coverImage', 'description']) {
        expect(ctrl(name).touched).toBe(true);
        expect(ctrl(name).hasError('required')).toBe(true);
      }
      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(directorApiMock.createEvent).not.toHaveBeenCalled();
    });

    it('en un partido debe exigir deporte, los seis campos del enfrentamiento y el delegado', () => {
      ctrl('type').setValue('MATCH');

      for (const name of ['sportId', 'teamOneInstitutionId', 'teamOneCampusId', 'teamOneId', 'teamTwoInstitutionId', 'teamTwoCampusId', 'teamTwoId', 'delegateOid']) {
        expect(ctrl(name).hasError('required')).toBe(true);
      }
      expect(ctrl('organizerInstitutionId').hasError('required')).toBe(false);
    });

    it('en otro tipo debe exigir institución y sede organizadoras, con deporte y delegado opcionales', () => {
      ctrl('type').setValue('MEETING');

      expect(ctrl('organizerInstitutionId').hasError('required')).toBe(true);
      expect(ctrl('organizerCampusId').hasError('required')).toBe(true);
      expect(ctrl('organizerTeamId').hasError('required')).toBe(false);
      expect(ctrl('sportId').hasError('required')).toBe(false);
      expect(ctrl('delegateOid').hasError('required')).toBe(false);
      expect(ctrl('teamOneId').hasError('required')).toBe(false);
    });

    it('debe aceptar un evento que cruza la medianoche', () => {
      fillCommon();
      expect(ctrl('endDate').hasError('endBeforeStart')).toBe(false);
      expect(ctrl('endTime').hasError('endBeforeStart')).toBe(false);
    });

    it('debe marcar endTime si el mismo día termina antes de empezar', () => {
      fillCommon();
      form().patchValue({ endDate: new Date(2026, 9, 24), endTime: new Date(2026, 9, 24, 20, 0) });

      expect(ctrl('endTime').hasError('endBeforeStart')).toBe(true);
      expect(ctrl('endDate').hasError('endBeforeStart')).toBe(false);
    });

    it('debe marcar endDate si la fecha de término es anterior a la de inicio', () => {
      fillCommon();
      ctrl('endDate').setValue(new Date(2026, 9, 23));

      expect(ctrl('endDate').hasError('endBeforeStart')).toBe(true);
    });

    it('debe marcar eventDate si la fecha de inicio es posterior a la de término', () => {
      fillCommon();
      ctrl('eventDate').setValue(new Date(2026, 9, 26));
      component.onStartDateChange();

      expect(ctrl('eventDate').hasError('startAfterEnd')).toBe(true);
      expect(ctrl('eventDate').touched).toBe(true);
      expect(component['fieldError']('eventDate')).toBe(
        'La fecha de inicio no puede ser posterior a la de término.',
      );
    });

    it('debe aceptar inicio y término el mismo día', () => {
      fillCommon();
      ctrl('eventDate').setValue(new Date(2026, 9, 25));

      expect(ctrl('eventDate').hasError('startAfterEnd')).toBe(false);
    });

    it('debe limpiar el error de eventDate al corregir la fecha de término', () => {
      fillCommon();
      ctrl('eventDate').setValue(new Date(2026, 9, 26));
      expect(ctrl('eventDate').hasError('startAfterEnd')).toBe(true);

      ctrl('endDate').setValue(new Date(2026, 9, 27));
      expect(ctrl('eventDate').hasError('startAfterEnd')).toBe(false);
    });

    it('no debe permitir el mismo equipo a ambos lados', () => {
      fillMatch();
      ctrl('teamTwoId').setValue(100);

      expect(ctrl('teamTwoId').hasError('sameTeam')).toBe(true);
    });

    it('debe permitir dos equipos de la misma institución', () => {
      fillMatch();
      form().patchValue({ teamTwoInstitutionId: 1, teamTwoCampusId: 11, teamTwoId: 103 });

      expect(ctrl('teamTwoId').valid).toBe(true);
    });

    it('debe exigir que ambos equipos sean de la misma división', () => {
      fillMatch();
      ctrl('teamTwoId').setValue(101);
      component.onTeamOneSelected({ id: 100, name: 'USACH Fútbol Varones', division: 'MASCULINO' });
      component.onTeamTwoSelected({ id: 101, name: 'USACH Fútbol Damas', division: 'FEMENINO' });

      expect(ctrl('teamTwoId').hasError('divisionMismatch')).toBe(true);
    });
  });

  describe('Reacciones del formulario', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('cambiar a un tipo que no es partido debe vaciar el enfrentamiento', () => {
      fillMatch();
      ctrl('type').setValue('MEETING');
      component.onTypeSelected();

      expect(ctrl('teamOneId').value).toBeNull();
      expect(ctrl('teamTwoCampusId').value).toBeNull();
      expect(ctrl('delegateOid').value).toBe(DELEGATES[0].oid);
    });

    it('cambiar el deporte debe vaciar los equipos y el equipo organizador', () => {
      fillMatch();
      ctrl('organizerTeamId').setValue(100);
      component.onSportSelected();

      expect(ctrl('teamOneInstitutionId').value).toBeNull();
      expect(ctrl('teamTwoId').value).toBeNull();
      expect(ctrl('organizerTeamId').value).toBeNull();
      expect(ctrl('sportId').value).toBe(3);
    });

    it('elegir la fecha de inicio debe precargar la de término solo si está vacía', () => {
      ctrl('eventDate').setValue(new Date(2026, 9, 24));
      component.onStartDateChange();
      expect((ctrl('endDate').value as Date).getDate()).toBe(24);

      ctrl('eventDate').setValue(new Date(2026, 9, 20));
      component.onStartDateChange();
      expect((ctrl('endDate').value as Date).getDate()).toBe(24);
    });
  });

  describe('Modo Edición y Descarte (onEdit / onCancelEdit)', () => {
    beforeEach(() => {
      setupTestBed('EVT-42');
      fixture.detectChanges();
    });

    it('onEdit debe habilitar los controles, mantener internalId deshabilitado y cargar catálogos', () => {
      component.onEdit();

      expect(component['isEdit']()).toBe(true);
      expect(form().enabled).toBe(true);
      expect(ctrl('internalId').disabled).toBe(true);
      expect(ctrl('title').enabled).toBe(true);
      expect(catalogMock.getSports).toHaveBeenCalledTimes(1);
      expect(devDelegatesMock.getDelegates).toHaveBeenCalledTimes(1);
    });

    it('onEdit debe marcar al delegado guardado que ya no tiene el rol', () => {
      devDelegatesMock.getDelegates.mockReturnValue(of([DELEGATES[1]]));
      component.onEdit();

      const saved = component['delegateOptions']().find((d) => d.oid === DELEGATES[0].oid)!;
      expect(component['delegateLabel'](saved)).toBe('María Pérez (sin rol vigente)');
    });

    it('onCancelEdit sin cambios debe restaurar el modo lectura sin abrir diálogo', () => {
      component.onEdit();
      component.onCancelEdit();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(component['isEdit']()).toBe(false);
      expect(form().disabled).toBe(true);
    });

    it('onCancelEdit con formulario dirty debe abrir diálogo y descartar si el usuario confirma', () => {
      component.onEdit();
      ctrl('title').setValue('Nuevo Título Sin Guardar');
      ctrl('title').markAsDirty();

      dialogMock.open.mockReturnValue({ afterClosed: vi.fn().mockReturnValue(of(true)) });
      component.onCancelEdit();

      expect(dialogMock.open).toHaveBeenCalled();
      expect(component['isEdit']()).toBe(false);
      expect(ctrl('title').value).toBe(mockEvent.title);
      expect(form().disabled).toBe(true);
    });

    it('onCancelEdit con formulario dirty debe permanecer editando si el usuario cancela el descarte', () => {
      component.onEdit();
      ctrl('title').setValue('Otro Título');
      ctrl('title').markAsDirty();

      dialogMock.open.mockReturnValue({ afterClosed: vi.fn().mockReturnValue(of(false)) });
      component.onCancelEdit();

      expect(component['isEdit']()).toBe(true);
      expect(ctrl('title').value).toBe('Otro Título');
    });
  });

  describe('Creación de Evento (onSave en modo creación)', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('debe mandar un partido como body plano por IDs y volver a modo lectura', () => {
      fillMatch();
      component.onSave();

      expect(dialogMock.open).toHaveBeenCalled();
      const body = directorApiMock.createEvent.mock.calls[0][0];
      expect(body).toEqual(
        expect.objectContaining({
          internalId: 'EVT-NUEVO',
          type: 'MATCH',
          sportId: 3,
          eventDate: '2026-10-24',
          startTime: '22:00',
          endDate: '2026-10-25',
          endTime: '00:30',
          teamOneInstitutionId: 1,
          teamOneCampusId: 10,
          teamOneId: 100,
          teamTwoId: 200,
          organizerInstitutionId: null,
          organizerCampusId: null,
          organizerTeamId: null,
          delegateOid: DELEGATES[0].oid,
          delegateDisplayName: 'María Pérez',
        }),
      );
      // Nunca objetos anidados en la escritura.
      for (const nested of ['sport', 'organizer', 'teamOne', 'teamTwo', 'delegate', 'category', 'organizationId']) {
        expect(body).not.toHaveProperty(nested);
      }

      expect(component['isCreateMode']()).toBe(false);
      expect(component['isEdit']()).toBe(false);
      expect(form().disabled).toBe(true);
    });

    it('debe mandar los seis campos del enfrentamiento en null en un evento que no es partido', () => {
      fillCommon();
      form().patchValue({
        type: 'TRACKDAY',
        organizerInstitutionId: 1,
        organizerCampusId: 10,
        teamOneId: 100,
      });
      component.onSave();

      const body = directorApiMock.createEvent.mock.calls[0][0];
      expect(body.organizerInstitutionId).toBe(1);
      expect(body.organizerCampusId).toBe(10);
      expect(body.organizerTeamId).toBeNull();
      expect(body.sportId).toBeNull();
      expect(body.teamOneId).toBeNull();
      expect(body.delegateOid).toBeNull();
      expect(body.delegateDisplayName).toBeNull();
    });

    it('no debe guardar un partido sin delegado', () => {
      fillMatch();
      ctrl('delegateOid').setValue(null);
      component.onSave();

      expect(ctrl('delegateOid').hasError('required')).toBe(true);
      expect(directorApiMock.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('Actualización de Evento (onSave en modo edición)', () => {
    beforeEach(() => {
      setupTestBed('EVT-42');
      fixture.detectChanges();
      component.onEdit();
    });

    it('debe llamar a updateEvent por internalId y restaurar a modo lectura', () => {
      ctrl('title').setValue('Título Editado y Guardado');
      component.onSave();

      expect(directorApiMock.updateEvent).toHaveBeenCalledWith(
        'EVT-42',
        expect.objectContaining({ title: 'Título Editado y Guardado', internalId: 'EVT-42' }),
      );
      expect(component['isEdit']()).toBe(false);
      expect(form().disabled).toBe(true);
    });

    it('debe registrar error si updateEvent falla', () => {
      directorApiMock.updateEvent.mockReturnValue(throwError(() => new Error('Error al actualizar')));
      component.onSave();

      expect(component['isSaving']()).toBe(false);
      expect(component['error']()).toContain('No se pudieron guardar los cambios');
    });
  });

  describe('Eliminación de Evento (onDelete)', () => {
    beforeEach(() => {
      setupTestBed('EVT-42');
      fixture.detectChanges();
    });

    it('debe abrir diálogo de confirmación y llamar a deleteEvent por internalId', () => {
      component.onDelete();

      expect(dialogMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Confirmación de Eliminación', variant: 'danger' }),
        }),
      );
      expect(directorApiMock.deleteEvent).toHaveBeenCalledWith('EVT-42');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/director/events']);
    });

    it('no debe llamar a deleteEvent si el usuario cancela en el diálogo', () => {
      dialogMock.open.mockReturnValue({ afterClosed: vi.fn().mockReturnValue(of(false)) });
      component.onDelete();

      expect(directorApiMock.deleteEvent).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('debe registrar mensaje de error si deleteEvent falla', () => {
      directorApiMock.deleteEvent.mockReturnValue(throwError(() => new Error('Error')));
      component.onDelete();

      expect(component['error']()).toContain('No se pudo eliminar el evento');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('Gestión de Fotos Adicionales (FormArray)', () => {
    beforeEach(() => {
      setupTestBed('EVT-42');
      fixture.detectChanges();
    });

    it('addPhoto debe añadir un nuevo control al FormArray de fotos', () => {
      expect(component.photosArray.length).toBe(1);
      component.addPhoto();
      expect(component.photosArray.length).toBe(2);
      expect(component.photosArray.at(1).value).toBe('');
    });

    it('removePhoto debe eliminar el control en la posición indicada', () => {
      component.addPhoto();
      component.removePhoto(0);
      expect(component.photosArray.length).toBe(1);
    });
  });

  describe('Navegación y Utilidades', () => {
    beforeEach(() => {
      setupTestBed('EVT-42');
      fixture.detectChanges();
    });

    it('onBack debe navegar a /director/events', () => {
      component.onBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/director/events']);
    });
  });
});
