import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { SedeApiService, type Sede } from './sede-api.service';
import { bffAdminUrl, type AdminCampus } from './admin-bff';

describe('SedeApiService', () => {
  const CAMPUS: AdminCampus = {
    id: 10,
    name: 'Campus Central',
    city: 'Santiago',
    address: 'Av. Libertador Bernardo O\'Higgins 3363',
    institutionId: 3,
    institutionName: 'Universidad de Santiago de Chile',
  };
  const campusesUrl = `${bffAdminUrl()}/campuses`;
  const account = { homeAccountId: 'home-1', username: 'admin@athenet.cl' } as any;

  let service: SedeApiService;
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

    service = TestBed.inject(SedeApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe listar con el access token y traducir al modelo de la vista', () => {
    let sedes: Sede[] = [];
    service.getSedes().subscribe((list) => (sedes = list));

    const req = httpTesting.expectOne(campusesUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush([CAMPUS]);

    expect(sedes).toEqual([
      {
        id: 10,
        nombre: 'Campus Central',
        ciudad: 'Santiago',
        direccion: 'Av. Libertador Bernardo O\'Higgins 3363',
        institucionId: 3,
        institucionNombre: 'Universidad de Santiago de Chile',
      },
    ]);
  });

  it('debe filtrar por institución con el query param del BFF', () => {
    service.getSedes(3).subscribe();
    httpTesting.expectOne(`${campusesUrl}?institutionId=3`).flush([CAMPUS]);
  });

  it('debe crear enviando el body en inglés, sin el nombre de la institución', () => {
    service
      .crearSede({ nombre: 'Campus Sur', ciudad: 'Concepción', direccion: 'Calle 1', institucionId: 3 })
      .subscribe();

    const req = httpTesting.expectOne(campusesUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Campus Sur',
      city: 'Concepción',
      address: 'Calle 1',
      institutionId: 3,
    });
    req.flush({ ...CAMPUS, id: 11 });
  });

  it('debe actualizar con PUT /{id} y eliminar con DELETE /{id}', () => {
    service
      .actualizarSede(10, { nombre: 'Campus Central', ciudad: 'Santiago', direccion: 'Otra', institucionId: 3 })
      .subscribe();
    const put = httpTesting.expectOne(`${campusesUrl}/10`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.address).toBe('Otra');
    put.flush(CAMPUS);

    service.eliminarSede(10).subscribe();
    const del = httpTesting.expectOne(`${campusesUrl}/10`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
  });
});
