import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { EventCatalogService } from './event-catalog.service';
import { bffBaseUrl, type EventType, type Institution, type Sport } from './bff';

describe('EventCatalogService', () => {
  const SPORTS: Sport[] = [{ id: 3, name: 'Fútbol' }];
  const EVENT_TYPES: EventType[] = [
    { code: 'MATCH', label: 'Partido', requiresMatchup: true },
    { code: 'MEETING', label: 'Reunión', requiresMatchup: false },
  ];
  const INSTITUTIONS: Institution[] = [{ id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' }];

  const base = bffBaseUrl();
  let service: EventCatalogService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    const account = { homeAccountId: 'home-1', username: 'director@athenet.cl' };
    const msalMock = {
      instance: {
        getActiveAccount: vi.fn().mockReturnValue(account),
        getAllAccounts: vi.fn().mockReturnValue([account]),
        setActiveAccount: vi.fn(),
      },
      acquireTokenSilent: vi.fn().mockReturnValue(of({ accessToken: 'api-access-token' })),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EventCatalogService,
        { provide: MsalService, useValue: msalMock },
      ],
    });
    service = TestBed.inject(EventCatalogService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe pedir deportes y tipos de evento al BFF', () => {
    let deportes: any[] = [];
    let tipos: any[] = [];
    service.getSports().subscribe((lista) => (deportes = lista));
    service.getEventTypes().subscribe((lista) => (tipos = lista));

    const reqSports = httpTesting.expectOne(`${base}/sports`);
    expect(reqSports.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    reqSports.flush(SPORTS);
    httpTesting.expectOne(`${base}/event-types`).flush(EVENT_TYPES);

    expect(deportes).toEqual(SPORTS);
    expect(tipos.find((t) => t.code === 'MATCH').requiresMatchup).toBe(true);
  });

  it('debe pedir los delegados al BFF, no a Graph', () => {
    const delegados = [{ oid: 'oid-1', displayName: 'María Pérez' }];
    let recibidos: any[] = [];
    service.getDelegates().subscribe((lista) => (recibidos = lista));

    const req = httpTesting.expectOne(`${base}/delegates`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush(delegados);

    expect(recibidos).toEqual(delegados);
  });

  it('debe mandar sportId solo cuando viene', () => {
    service.getInstitutions().subscribe();
    service.getInstitutions(3).subscribe();

    httpTesting.expectOne(`${base}/institutions`).flush(INSTITUTIONS);
    httpTesting.expectOne(`${base}/institutions?sportId=3`).flush(INSTITUTIONS);
  });

  it('debe armar las rutas de la cascada con sus filtros', () => {
    service.getCampuses(1, 3).subscribe();
    service.getTeams(10, 3, 'MASCULINO').subscribe();
    service.getTeams(10).subscribe();

    httpTesting.expectOne(`${base}/institutions/1/campuses?sportId=3`).flush([]);
    httpTesting.expectOne(`${base}/campuses/10/teams?sportId=3&division=MASCULINO`).flush([]);
    httpTesting.expectOne(`${base}/campuses/10/teams`).flush([]);
  });

  it('debe reutilizar la respuesta cuando dos cascadas piden lo mismo', () => {
    let primera: any[] = [];
    let segunda: any[] = [];
    service.getCampuses(1, 3).subscribe((lista) => (primera = lista));
    httpTesting.expectOne(`${base}/institutions/1/campuses?sportId=3`).flush([{ id: 10, name: 'Casa Central' }]);

    service.getCampuses(1, 3).subscribe((lista) => (segunda = lista));
    httpTesting.expectNone(`${base}/institutions/1/campuses?sportId=3`);

    expect(segunda).toEqual(primera);
  });

  it('debe volver a pedir si la primera petición falló', () => {
    service.getSports().subscribe({ error: () => undefined });
    httpTesting.expectOne(`${base}/sports`).flush(null, { status: 503, statusText: 'Unavailable' });

    let deportes: any[] = [];
    service.getSports().subscribe((lista) => (deportes = lista));
    httpTesting.expectOne(`${base}/sports`).flush(SPORTS);

    expect(deportes).toEqual(SPORTS);
  });
});
