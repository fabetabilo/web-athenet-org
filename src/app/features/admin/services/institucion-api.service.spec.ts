import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { InstitucionApiService, type Institucion } from './institucion-api.service';
import { bffAdminUrl, type AdminInstitution } from './admin-bff';

describe('InstitucionApiService', () => {
  const INSTITUTION: AdminInstitution = {
    id: 3,
    name: 'Universidad de Santiago de Chile',
    acronym: 'USACH',
    imageUrl: 'https://example.com/usach.png',
    active: false,
  };
  const institutionsUrl = `${bffAdminUrl()}/institutions`;
  const account = { homeAccountId: 'home-1', username: 'admin@athenet.cl' } as any;

  let service: InstitucionApiService;
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

    service = TestBed.inject(InstitucionApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe listar con el access token y traducir al modelo de la vista', () => {
    let instituciones: Institucion[] = [];
    service.getInstituciones().subscribe((list) => (instituciones = list));

    const req = httpTesting.expectOne(institutionsUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer api-access-token');
    req.flush([INSTITUTION]);

    expect(instituciones).toEqual([
      {
        id: 3,
        nombre: 'Universidad de Santiago de Chile',
        sigla: 'USACH',
        imagenUrl: 'https://example.com/usach.png',
        activo: false,
      },
    ]);
  });

  it('debe crear enviando el body en inglés', () => {
    service
      .crearInstitucion({ nombre: 'Universidad de Chile', sigla: 'UCH', imagenUrl: null, activo: true })
      .subscribe();

    const req = httpTesting.expectOne(institutionsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Universidad de Chile',
      acronym: 'UCH',
      imageUrl: null,
      active: true,
    });
    req.flush({ ...INSTITUTION, id: 4 });
  });

  it('debe actualizar con PUT /{id} y eliminar con DELETE /{id}', () => {
    service
      .actualizarInstitucion(3, { nombre: 'USACH', sigla: 'USACH', imagenUrl: null, activo: true })
      .subscribe();
    const put = httpTesting.expectOne(`${institutionsUrl}/3`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.active).toBe(true);
    put.flush(INSTITUTION);

    service.eliminarInstitucion(3).subscribe();
    const del = httpTesting.expectOne(`${institutionsUrl}/3`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
  });
});
