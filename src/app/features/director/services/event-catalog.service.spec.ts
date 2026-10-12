import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { EventCatalogService } from './event-catalog.service';
import {
  bffCommonUrl,
  bffDirectorUrl,
  type EventTypeOption,
  type InstitutionOption,
  type SportOption,
} from './bff';

describe('EventCatalogService', () => {
  const SPORTS: SportOption[] = [{ id: 3, name: 'Fútbol' }];
  const EVENT_TYPES: EventTypeOption[] = [
    { code: 'MATCH', label: 'Partido', requiresMatchup: true },
    { code: 'MEETING', label: 'Reunión', requiresMatchup: false },
  ];
  const INSTITUTIONS: InstitutionOption[] = [{ id: 1, name: 'Universidad de Santiago de Chile', acronym: 'USACH' }];

  const director = bffDirectorUrl();
  const common = bffCommonUrl();
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

  it('debe usar /api/director y /api/common del BFF', () => {
    expect(director).toMatch(/[^/]\/api\/director$/);
    expect(common).toMatch(/[^/]\/api\/common$/);
  });

  it('debe pedir tipos de evento a /api/director y deportes a /api/common', () => {
    let deportes: any[] = [];
    let tipos: any[] = [];
    service.getSports().subscribe((lista) => (deportes = lista));
    service.getEventTypes().subscribe((lista) => (tipos = lista));

    const reqSports = httpTesting.expectOne(`${common}/sports`);
    expect(reqSports.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    reqSports.flush(SPORTS);
    const reqTypes = httpTesting.expectOne(`${director}/event-types`);
    expect(reqTypes.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    reqTypes.flush(EVENT_TYPES);

    expect(deportes).toEqual(SPORTS);
    expect(tipos.find((t) => t.code === 'MATCH').requiresMatchup).toBe(true);
  });

  it('debe mandar sportId solo cuando viene', () => {
    service.getInstitutions().subscribe();
    service.getInstitutions(3).subscribe();

    httpTesting.expectOne(`${common}/institutions`).flush(INSTITUTIONS);
    httpTesting.expectOne(`${common}/institutions?sportId=3`).flush(INSTITUTIONS);
  });

  it('debe armar las rutas de la cascada con sus filtros', () => {
    service.getCampuses(1, 3).subscribe();
    service.getTeams(10, 3, 'MASCULINO').subscribe();
    service.getTeams(10).subscribe();

    httpTesting.expectOne(`${common}/institutions/1/campuses?sportId=3`).flush([]);
    httpTesting.expectOne(`${common}/campuses/10/teams?sportId=3&division=MASCULINO`).flush([]);
    httpTesting.expectOne(`${common}/campuses/10/teams`).flush([]);
  });

  it('debe reutilizar la respuesta cuando dos cascadas piden lo mismo', () => {
    let primera: any[] = [];
    let segunda: any[] = [];
    service.getCampuses(1, 3).subscribe((lista) => (primera = lista));
    httpTesting.expectOne(`${common}/institutions/1/campuses?sportId=3`).flush([{ id: 10, name: 'Casa Central' }]);

    service.getCampuses(1, 3).subscribe((lista) => (segunda = lista));
    httpTesting.expectNone(`${common}/institutions/1/campuses?sportId=3`);

    expect(segunda).toEqual(primera);
  });

  it('debe volver a pedir si la primera petición falló', () => {
    service.getSports().subscribe({ error: () => undefined });
    httpTesting.expectOne(`${common}/sports`).flush(null, { status: 503, statusText: 'Unavailable' });

    let deportes: any[] = [];
    service.getSports().subscribe((lista) => (deportes = lista));
    httpTesting.expectOne(`${common}/sports`).flush(SPORTS);

    expect(deportes).toEqual(SPORTS);
  });
});
