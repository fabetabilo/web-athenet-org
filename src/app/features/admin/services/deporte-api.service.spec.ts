import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { DeporteApiService, type Deporte } from './deporte-api.service';
import { bffAdminUrl, type AdminSport } from './admin-bff';

describe('DeporteApiService', () => {
  const SPORT: AdminSport = { id: 1, name: 'Fútbol', description: 'Once contra once' };
  const sportsUrl = `${bffAdminUrl()}/sports`;
  const account = { homeAccountId: 'home-1', username: 'admin@athenet.cl' } as any;

  let service: DeporteApiService;
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

    service = TestBed.inject(DeporteApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe usar la ruta de admin en el BFF', () => {
    expect(sportsUrl).toMatch(/[^/]\/api\/admin\/sports$/);
  });

  it('debe listar con el access token y traducir al modelo de la vista', () => {
    let deportes: Deporte[] = [];
    service.getDeportes().subscribe((list) => (deportes = list));

    const req = httpTesting.expectOne(sportsUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush([SPORT]);

    expect(deportes).toEqual([{ id: 1, nombre: 'Fútbol', descripcion: 'Once contra once' }]);
  });

  it('debe crear enviando el body en inglés', () => {
    let creado: Deporte | undefined;
    service.crearDeporte({ nombre: 'Fútbol', descripcion: null }).subscribe((d) => (creado = d));

    const req = httpTesting.expectOne(sportsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Fútbol', description: null });
    req.flush({ ...SPORT, description: null });

    expect(creado?.nombre).toBe('Fútbol');
  });

  it('debe actualizar con PUT /{id}', () => {
    service.actualizarDeporte(1, { nombre: 'Futsal', descripcion: 'Cinco contra cinco' }).subscribe();

    const req = httpTesting.expectOne(`${sportsUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Futsal', description: 'Cinco contra cinco' });
    req.flush({ id: 1, name: 'Futsal', description: 'Cinco contra cinco' });
  });

  it('debe eliminar con DELETE /{id}', () => {
    service.eliminarDeporte(1).subscribe();

    const req = httpTesting.expectOne(`${sportsUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
