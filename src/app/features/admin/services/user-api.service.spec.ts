import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import {
  DEFAULT_APP_ROLE_ID,
  UserApiService,
  construirCatalogoDeRoles,
  esErrorDeConsentimiento,
  resolverRolesPorUsuario,
  roleIcon,
  type GraphAppRole,
  type GraphAppRoleAssignment,
  type GraphUser,
} from './user-api.service';
import { environment } from '../../../../environments/environment';
import { GRAPH_BASE_URL, graphRequest } from '../../../../auth/graphRequest';

describe('UserApiService', () => {
  const graphUrl = GRAPH_BASE_URL;
  const servicePrincipalUrl = `${graphUrl}/servicePrincipals(appId='${environment.clientId}')`;
  const usersUrl = `${graphUrl}/users?$select=id,displayName,userPrincipalName,mail,accountEnabled`;

  const account = { homeAccountId: 'home-1', username: 'admin@athenet.cl' } as any;

  let service: UserApiService;
  let httpTesting: HttpTestingController;
  let msalMock: any;

  beforeEach(() => {
    msalMock = {
      instance: {
        getActiveAccount: vi.fn().mockReturnValue(account),
        getAllAccounts: vi.fn().mockReturnValue([account]),
        setActiveAccount: vi.fn(),
      },
      acquireTokenSilent: vi.fn().mockReturnValue(
        // El resultado trae los dos tokens: el servicio debe usar el de acceso.
        of({ accessToken: 'graph-access-token', idToken: 'id-token-que-graph-rechaza' }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserApiService,
        { provide: MsalService, useValue: msalMock },
      ],
    });

    service = TestBed.inject(UserApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // ignoreCancelled: forkJoin cancela las lecturas hermanas al primer error,
    // y esa cancelación es el comportamiento esperado, no una fuga.
    httpTesting.verify({ ignoreCancelled: true });
  });

  describe('getDirectory', () => {
    it('debe pedir las tres lecturas de Graph con el Access Token delegado', () => {
      service.getDirectory().subscribe();

      const reqUsers = httpTesting.expectOne(usersUrl);
      const reqSp = httpTesting.expectOne(`${servicePrincipalUrl}?$select=id,appRoles`);
      const reqAssignments = httpTesting.expectOne(`${servicePrincipalUrl}/appRoleAssignedTo`);

      for (const req of [reqUsers, reqSp, reqAssignments]) {
        expect(req.request.method).toBe('GET');
        // Access Token de Graph, no ID Token: Graph valida aud = graph.microsoft.com
        expect(req.request.headers.get('Authorization')).toBe('Bearer graph-access-token');
        expect(req.request.headers.get('Authorization')).not.toContain('id-token');
      }

      expect(msalMock.acquireTokenSilent).toHaveBeenCalledTimes(1);
      expect(msalMock.acquireTokenSilent).toHaveBeenCalledWith(
        expect.objectContaining({ scopes: graphRequest.scopes, account }),
      );

      reqUsers.flush({ value: [] });
      reqSp.flush({ id: 'sp-1', appRoles: [] });
      reqAssignments.flush({ value: [] });
    });

    it('debe entregar usuarios con roles resueltos y el catálogo, sin exponer appRoleId', () => {
      let resultado: any;
      service.getDirectory().subscribe((directorio) => (resultado = directorio));

      httpTesting.expectOne(usersUrl).flush({
        value: [
          {
            id: 'oid-1',
            displayName: 'Camila Rojas',
            userPrincipalName: 'camila@tenant.onmicrosoft.com',
            mail: 'camila@tenant.onmicrosoft.com',
            accountEnabled: true,
          },
          {
            id: 'oid-2',
            displayName: 'Valentina Soto',
            userPrincipalName: 'valentina@tenant.onmicrosoft.com',
            mail: null,
            accountEnabled: true,
          },
        ],
      });
      httpTesting.expectOne(`${servicePrincipalUrl}?$select=id,appRoles`).flush({
        id: 'sp-1',
        appRoles: [
          {
            id: 'role-director',
            value: 'director',
            displayName: 'Director de Eventos',
            description: 'Programación y fiscalización.',
            allowedMemberTypes: ['User'],
            isEnabled: true,
          },
          {
            id: 'role-delegate',
            value: 'delegate',
            displayName: 'Delegado de Evento',
            description: 'Certifica un evento.',
            allowedMemberTypes: ['User'],
            isEnabled: true,
          },
        ],
      });
      httpTesting.expectOne(`${servicePrincipalUrl}/appRoleAssignedTo`).flush({
        value: [
          { appRoleId: 'role-director', principalId: 'oid-1', principalType: 'User' },
          { appRoleId: 'role-delegate', principalId: 'oid-1', principalType: 'User' },
        ],
      });

      expect(resultado.users.length).toBe(2);
      expect(resultado.users[0].roles).toEqual(['director', 'delegate']);
      expect(resultado.users[1].roles).toEqual([]);
      expect(JSON.stringify(resultado.users)).not.toContain('role-director');
      expect(resultado.roles.map((r: any) => r.code)).toEqual(['director', 'delegate']);
    });

    it('debe propagar el 403 de Graph cuando falta el permiso delegado', () => {
      let error: any;
      service.getDirectory().subscribe({ error: (err) => (error = err) });

      httpTesting
        .expectOne(usersUrl)
        .flush(
          { error: { code: 'Authorization_RequestDenied', message: 'Insufficient privileges.' } },
          { status: 403, statusText: 'Forbidden' },
        );
      // forkJoin cancela las otras dos lecturas al primer error, así que no
      // quedan peticiones abiertas que responder.

      expect(error.status).toBe(403);
      expect(esErrorDeConsentimiento(error)).toBe(true);
    });
  });

  it('debe fallar con un mensaje claro si no hay sesión activa', () => {
    msalMock.instance.getActiveAccount.mockReturnValue(null);
    msalMock.instance.getAllAccounts.mockReturnValue([]);
    let mensaje = '';

    service.getDirectory().subscribe({ error: (err) => (mensaje = err.message) });

    expect(mensaje).toContain('No hay una sesión activa');
  });

  describe('resolverRolesPorUsuario', () => {
    const appRoles: GraphAppRole[] = [
      { id: 'role-admin', value: 'admin', displayName: 'Administrador' },
      { id: 'role-director', value: 'director', displayName: 'Director' },
    ];

    const usuarios: GraphUser[] = [
      {
        id: 'oid-1',
        displayName: 'Juan Herrera',
        userPrincipalName: 'juan@tenant.onmicrosoft.com',
        mail: 'juan@tenant.onmicrosoft.com',
        accountEnabled: true,
      },
    ];

    it('debe descartar las asignaciones que no son de usuarios', () => {
      const asignaciones: GraphAppRoleAssignment[] = [
        { appRoleId: 'role-admin', principalId: 'oid-1', principalType: 'Group' },
        { appRoleId: 'role-director', principalId: 'oid-1', principalType: 'ServicePrincipal' },
      ];

      expect(resolverRolesPorUsuario(usuarios, appRoles, asignaciones)[0].roles).toEqual([]);
    });

    it('debe descartar la asignación sin rol concreto (appRoleId en ceros)', () => {
      const asignaciones: GraphAppRoleAssignment[] = [
        { appRoleId: DEFAULT_APP_ROLE_ID, principalId: 'oid-1', principalType: 'User' },
      ];

      expect(resolverRolesPorUsuario(usuarios, appRoles, asignaciones)[0].roles).toEqual([]);
    });

    it('debe ignorar asignaciones de roles que ya no están en el manifest', () => {
      const asignaciones: GraphAppRoleAssignment[] = [
        { appRoleId: 'role-eliminado', principalId: 'oid-1', principalType: 'User' },
        { appRoleId: 'role-admin', principalId: 'oid-1', principalType: 'User' },
      ];

      expect(resolverRolesPorUsuario(usuarios, appRoles, asignaciones)[0].roles).toEqual(['admin']);
    });

    it('no debe duplicar un rol asignado dos veces', () => {
      const asignaciones: GraphAppRoleAssignment[] = [
        { appRoleId: 'role-admin', principalId: 'oid-1', principalType: 'User' },
        { appRoleId: 'role-admin', principalId: 'oid-1', principalType: 'User' },
      ];

      expect(resolverRolesPorUsuario(usuarios, appRoles, asignaciones)[0].roles).toEqual(['admin']);
    });

    it('debe tolerar respuestas vacías o incompletas de Graph', () => {
      expect(resolverRolesPorUsuario(undefined, undefined, undefined)).toEqual([]);

      const parcial = resolverRolesPorUsuario([{ id: 'oid-9' }], [], []);
      expect(parcial[0].displayName).toBe('');
      expect(parcial[0].mail).toBeNull();
      expect(parcial[0].accountEnabled).toBe(true);
      expect(parcial[0].roles).toEqual([]);
    });
  });

  describe('construirCatalogoDeRoles', () => {
    it('debe quedarse solo con los roles habilitados y asignables a personas', () => {
      const catalogo = construirCatalogoDeRoles([
        {
          id: 'r1',
          value: 'admin',
          displayName: 'Administrador',
          description: 'Gestión global.',
          allowedMemberTypes: ['User'],
          isEnabled: true,
        },
        {
          id: 'r2',
          value: 'legacy',
          displayName: 'Rol deshabilitado',
          allowedMemberTypes: ['User'],
          isEnabled: false,
        },
        {
          id: 'r3',
          value: 'daemon',
          displayName: 'Solo aplicaciones',
          allowedMemberTypes: ['Application'],
          isEnabled: true,
        },
        { id: 'r4', value: null, displayName: 'Sin value' },
      ]);

      expect(catalogo.length).toBe(1);
      expect(catalogo[0]).toEqual({
        code: 'admin',
        displayName: 'Administrador',
        description: 'Gestión global.',
      });
    });

    it('debe tolerar un service principal sin appRoles', () => {
      expect(construirCatalogoDeRoles(undefined)).toEqual([]);
    });
  });

  describe('esErrorDeConsentimiento', () => {
    it('debe reconocer los errores de MSAL que exigen consentimiento', () => {
      expect(
        esErrorDeConsentimiento(new InteractionRequiredAuthError('consent_required', 'corr-1')),
      ).toBe(true);
      expect(esErrorDeConsentimiento({ errorCode: 'consent_required' })).toBe(true);
      expect(esErrorDeConsentimiento({ errorCode: 'interaction_required' })).toBe(true);
    });

    it('debe reconocer el 403 Authorization_RequestDenied de Graph', () => {
      const err = new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        error: { error: { code: 'Authorization_RequestDenied' } },
      });

      expect(esErrorDeConsentimiento(err)).toBe(true);
    });

    it('no debe confundir una caída del servicio con falta de consentimiento', () => {
      expect(esErrorDeConsentimiento(new Error('Network error'))).toBe(false);
      expect(esErrorDeConsentimiento({ errorCode: 'login_required' })).toBe(false);
      expect(
        esErrorDeConsentimiento(new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
      ).toBe(false);
      expect(
        esErrorDeConsentimiento(
          new HttpErrorResponse({ status: 403, error: { error: { code: 'OtraCosa' } } }),
        ),
      ).toBe(false);
    });
  });

  it('roleIcon debe mapear los roles del manifest y tolerar códigos desconocidos', () => {
    expect(roleIcon('admin')).toBe('shield');
    expect(roleIcon('director')).toBe('event_note');
    expect(roleIcon('delegate')).toBe('sports');
    expect(roleIcon('auditor')).toBe('badge');
  });
});
