import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { DelegateApiService } from './delegate-api.service';
import { bffDelegateUrl, type DelegateMatch } from './delegate-bff';

describe('DelegateApiService', () => {
  /** Partido de octavos ya programado, con la forma de lectura del BFF. */
  const MATCH: DelegateMatch = {
    id: 7,
    competition: { id: 1, name: 'Copa Instituciones de Chile 2026', competitionImg: 'https://example.com/copa.png' },
    round: 'ROUND_OF_16',
    roundLabel: 'Octavos de final',
    date: '2026-10-24',
    time: '18:00',
    location: 'Estadio USACH',
    address: 'Av. Libertador Bernardo O\'Higgins 3363',
    homeTeam: { id: 100, name: 'USACH Fútbol Varones', logoUrl: null },
    awayTeam: { id: 200, name: 'U. de Chile Fútbol Varones', logoUrl: null },
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
  };

  const matchesUrl = `${bffDelegateUrl()}/matches`;
  const account = { homeAccountId: 'home-1', username: 'larry@athenet.cl' } as any;

  let service: DelegateApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    const msalMock = {
      instance: {
        getActiveAccount: vi.fn().mockReturnValue(account),
        getAllAccounts: vi.fn().mockReturnValue([account]),
        setActiveAccount: vi.fn(),
      },
      acquireTokenSilent: vi.fn().mockReturnValue(of({ accessToken: 'api-access-token' })),
      acquireTokenPopup: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MsalService, useValue: msalMock }],
    });

    service = TestBed.inject(DelegateApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe usar la ruta del delegado en el BFF', () => {
    expect(matchesUrl).toMatch(/[^/]\/api\/delegate\/matches$/);
  });

  it('debe listar los partidos con el access token de la API', () => {
    let matches: DelegateMatch[] = [];
    service.getMatches().subscribe((list) => (matches = list));

    const req = httpTesting.expectOne(matchesUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush([MATCH]);

    expect(matches.map((m) => m.id)).toEqual([7]);
  });

  it('debe buscar un partido en la lista y devolver null si no está asignado', () => {
    let found: DelegateMatch | null | undefined;
    service.getMatch(7).subscribe((m) => (found = m));
    httpTesting.expectOne(matchesUrl).flush([MATCH]);
    expect(found?.id).toBe(7);

    service.getMatch(99).subscribe((m) => (found = m));
    httpTesting.expectOne(matchesUrl).flush([MATCH]);
    expect(found).toBeNull();
  });

  it('debe iniciar con POST /{id}/start sin body', () => {
    service.startMatch(7).subscribe();
    const req = httpTesting.expectOne(`${matchesUrl}/7/start`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ ...MATCH, status: 'IN_PROGRESS' });
  });

  it('debe registrar el resultado con PUT /{id}/result', () => {
    service.registerResult(7, { homeScore: 2, awayScore: 1 }).subscribe();
    const req = httpTesting.expectOne(`${matchesUrl}/7/result`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ homeScore: 2, awayScore: 1 });
    req.flush({ ...MATCH, status: 'FINISHED', homeScore: 2, awayScore: 1 });
  });
});
