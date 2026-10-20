import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { EquipoApiService, type Equipo } from './equipo-api.service';
import { bffAdminUrl, type AdminTeam } from './admin-bff';

describe('EquipoApiService', () => {
  const TEAM: AdminTeam = {
    id: 100,
    name: 'USACH Fútbol Varones',
    division: 'MASCULINO',
    coach: 'Juan Pérez',
    logoUrl: null,
    campusId: 10,
    campusName: 'Campus Central',
    sportId: 1,
    sportName: 'Fútbol',
    active: true,
  };
  const teamsUrl = `${bffAdminUrl()}/teams`;
  const account = { homeAccountId: 'home-1', username: 'admin@athenet.cl' } as any;

  let service: EquipoApiService;
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

    service = TestBed.inject(EquipoApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe listar con el access token y traducir al modelo de la vista', () => {
    let equipos: Equipo[] = [];
    service.getEquipos().subscribe((list) => (equipos = list));

    const req = httpTesting.expectOne(teamsUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush([TEAM]);

    expect(equipos).toEqual([
      {
        id: 100,
        nombre: 'USACH Fútbol Varones',
        categoria: 'MASCULINO',
        entrenador: 'Juan Pérez',
        logoUrl: null,
        sedeId: 10,
        sedeNombre: 'Campus Central',
        deporteId: 1,
        deporteNombre: 'Fútbol',
        activo: true,
      },
    ]);
  });

  it('debe filtrar por sede con el query param del BFF', () => {
    service.getEquipos(10).subscribe();
    httpTesting.expectOne(`${teamsUrl}?campusId=10`).flush([TEAM]);
  });

  it('debe crear enviando el body en inglés, sin nombres resueltos ni activo', () => {
    service
      .crearEquipo({
        nombre: 'USACH Fútbol Damas',
        categoria: 'FEMENINO',
        entrenador: null,
        logoUrl: null,
        sedeId: 10,
        deporteId: 1,
      })
      .subscribe();

    const req = httpTesting.expectOne(teamsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'USACH Fútbol Damas',
      division: 'FEMENINO',
      coach: null,
      logoUrl: null,
      campusId: 10,
      sportId: 1,
    });
    req.flush({ ...TEAM, id: 101, division: 'FEMENINO' });
  });

  it('debe actualizar con PUT /{id} y eliminar con DELETE /{id}', () => {
    service
      .actualizarEquipo(100, {
        nombre: 'USACH Fútbol Varones',
        categoria: 'MIXTO',
        entrenador: 'Ana Soto',
        logoUrl: null,
        sedeId: 10,
        deporteId: 1,
      })
      .subscribe();
    const put = httpTesting.expectOne(`${teamsUrl}/100`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.division).toBe('MIXTO');
    expect(put.request.body.coach).toBe('Ana Soto');
    put.flush(TEAM);

    service.eliminarEquipo(100).subscribe();
    const del = httpTesting.expectOne(`${teamsUrl}/100`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
  });
});
