import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { DirectorApiService } from './director-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { bffDirectorUrl, type DirectorEvent, type EventWrite } from './bff';

describe('DirectorApiService', () => {
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

  const eventsUrl = `${bffDirectorUrl()}/events`;
  const account = { homeAccountId: 'home-1', username: 'director@athenet.cl' } as any;

  let service: DirectorApiService;
  let httpTesting: HttpTestingController;
  let msalMock: any;

  const payload = { internalId: 'EVT-42', title: 'Clásico' } as EventWrite;

  beforeEach(() => {
    msalMock = {
      instance: {
        getActiveAccount: vi.fn().mockReturnValue(account),
        getAllAccounts: vi.fn().mockReturnValue([account]),
        setActiveAccount: vi.fn(),
      },
      acquireTokenSilent: vi.fn().mockReturnValue(
        of({ accessToken: 'api-access-token', idToken: 'id-token-que-el-bff-rechaza' }),
      ),
      acquireTokenPopup: vi.fn().mockReturnValue(of({ accessToken: 'popup-access-token' })),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MsalService, useValue: msalMock },
      ],
    });

    service = TestBed.inject(DirectorApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe usar la ruta del director en el BFF', () => {
    expect(eventsUrl).toMatch(/[^/]\/api\/director\/events$/);
  });

  it('debe listar los eventos con el access token de la API, no con el idToken', () => {
    let eventos: any[] = [];
    service.getEvents().subscribe((lista) => (eventos = lista));

    const req = httpTesting.expectOne(eventsUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush([MATCH_EVENT, TRACKDAY_EVENT]);

    expect(eventos.map((e) => e.internalId)).toEqual(['EVT-42', 'EVT-43']);
    expect(eventos[0].teamOne.institution.acronym).toBe('USACH');
  });

  it('debe pedir el detalle por internalId', () => {
    service.getEventByInternalId('EVT-42').subscribe();
    httpTesting.expectOne(`${eventsUrl}/EVT-42`).flush(MATCH_EVENT);
  });

  it('debe crear con POST /events y actualizar con PUT /events/{internalId}', () => {
    service.createEvent(payload).subscribe();
    const post = httpTesting.expectOne(eventsUrl);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toBe(payload);
    post.flush(MATCH_EVENT, { status: 201, statusText: 'Created' });

    service.updateEvent('EVT-42', payload).subscribe();
    const put = httpTesting.expectOne(`${eventsUrl}/EVT-42`);
    expect(put.request.method).toBe('PUT');
    put.flush(MATCH_EVENT);
  });

  it('debe eliminar con DELETE /events/{internalId}', () => {
    let completado = false;
    service.deleteEvent('EVT-42').subscribe(() => (completado = true));

    const req = httpTesting.expectOne(`${eventsUrl}/EVT-42`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completado).toBe(true);
  });

  it('debe codificar el internalId en la URL', () => {
    service.getEventByInternalId('EVT/1').subscribe();
    httpTesting.expectOne(`${eventsUrl}/EVT%2F1`).flush(MATCH_EVENT);
  });

  it('debe abrir el popup solo si MSAL exige interacción', () => {
    msalMock.acquireTokenSilent.mockReturnValue(
      throwError(() => new InteractionRequiredAuthError('interaction_required', 'corr-1')),
    );

    service.getEvents().subscribe();

    const req = httpTesting.expectOne(eventsUrl);
    expect(msalMock.acquireTokenPopup).toHaveBeenCalledTimes(1);
    expect(req.request.headers.get('Authorization')).toBe('Bearer popup-access-token');
    req.flush([]);
  });

  it('debe propagar el error HTTP del BFF', () => {
    let status = 0;
    service.getEventByInternalId('EVT-999').subscribe({ error: (err) => (status = err.status) });

    httpTesting
      .expectOne(`${eventsUrl}/EVT-999`)
      .flush(
        { status: 404, code: 'NOT_FOUND', message: 'El evento EVT-999 no existe.', fieldErrors: [] },
        { status: 404, statusText: 'Not Found' },
      );
    expect(status).toBe(404);
  });

  it('debe renovar el token y reintentar una vez si el BFF responde 401', () => {
    msalMock.acquireTokenSilent
      .mockReturnValueOnce(of({ accessToken: 'token-vencido' }))
      .mockReturnValueOnce(of({ accessToken: 'token-renovado' }));
    let eventos: DirectorEvent[] = [];
    service.getEvents().subscribe((lista) => (eventos = lista));

    const primera = httpTesting.expectOne(eventsUrl);
    expect(primera.request.headers.get('Authorization')).toBe('Bearer token-vencido');
    primera.flush(null, { status: 401, statusText: 'Unauthorized' });

    const segunda = httpTesting.expectOne(eventsUrl);
    expect(segunda.request.headers.get('Authorization')).toBe('Bearer token-renovado');
    expect(msalMock.acquireTokenSilent.mock.calls[1][0].forceRefresh).toBe(true);
    segunda.flush([MATCH_EVENT]);

    expect(eventos.length).toBe(1);
  });

  it('debe propagar el 401 si el token renovado tampoco sirve', () => {
    let error: unknown;
    service.getEvents().subscribe({ error: (err) => (error = err) });

    httpTesting.expectOne(eventsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    httpTesting.expectOne(eventsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
  });

  it('debe fallar sin hacer la petición si MSAL no tiene cuenta', () => {
    msalMock.instance.getActiveAccount.mockReturnValue(null);
    msalMock.instance.getAllAccounts.mockReturnValue([]);
    let mensaje = '';

    service.getEvents().subscribe({ error: (err) => (mensaje = err.message) });

    expect(mensaje).toContain('No hay una sesión activa');
    httpTesting.expectNone(eventsUrl);
  });
});
