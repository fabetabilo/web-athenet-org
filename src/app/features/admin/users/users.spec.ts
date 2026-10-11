import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { UsersComponent } from './users';
import { UserDetailDialogComponent } from './user-detail-dialog/user-detail-dialog';
import { UserApiService, type AppRole, type AthenetUser } from '../services/user-api.service';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let apiServiceMock: { getDirectory: any };
  let dialogMock: { open: any };

  const mockUsers: AthenetUser[] = [
    {
      id: 'oid-1',
      displayName: 'Juan Herrera',
      userPrincipalName: 'juan.herrera@cloudnativejv3.onmicrosoft.com',
      mail: 'juan.herrera@cloudnativejv3.onmicrosoft.com',
      accountEnabled: true,
      roles: ['director'],
    },
    {
      id: 'oid-2',
      displayName: 'Valentina Soto',
      userPrincipalName: 'valentina.soto@cloudnativejv3.onmicrosoft.com',
      mail: null,
      accountEnabled: true,
      roles: [],
    },
    {
      id: 'oid-3',
      displayName: 'Camila Rojas',
      userPrincipalName: 'camila.rojas@cloudnativejv3.onmicrosoft.com',
      mail: 'camila.rojas@cloudnativejv3.onmicrosoft.com',
      accountEnabled: false,
      roles: ['director', 'delegate'],
    },
  ];

  const mockRoles: AppRole[] = [
    { code: 'admin', displayName: 'Administrador de Plataforma', description: 'Gestión global.' },
    { code: 'director', displayName: 'Director de Eventos', description: 'Programación y fiscalización.' },
    { code: 'delegate', displayName: 'Delegado de Evento', description: 'Certifica un evento.' },
  ];

  /** Celdas de una fila renderizada, en el orden de `columns`. */
  const celdas = (fila: Element): HTMLElement[] =>
    Array.from(fila.querySelectorAll('td')) as HTMLElement[];

  beforeEach(async () => {
    apiServiceMock = {
      getDirectory: vi.fn().mockReturnValue(of({ users: mockUsers, roles: mockRoles })),
    };

    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(undefined)),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        provideAnimations(),
        { provide: UserApiService, useValue: apiServiceMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y cargar el directorio con su catálogo de roles al inicializar', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(apiServiceMock.getDirectory).toHaveBeenCalledTimes(1);
    expect(component['users']().length).toBe(3);
    expect(component['roles']().length).toBe(3);
    expect(component['loading']()).toBe(false);
    expect(component['error']()).toBeNull();
  });

  it('debe renderizar una fila por usuario del directorio', () => {
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Juan Herrera');
    expect(rows[0].textContent).toContain('juan.herrera@cloudnativejv3.onmicrosoft.com');
  });

  it('debe mostrar la píldora "Sin rol asignado" para un usuario sin roles', () => {
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
    const celdaRoles = celdas(rows[1])[2];

    expect(celdaRoles.textContent).toContain('Sin rol asignado');
    expect(celdaRoles.querySelector('.variant-warning')).not.toBeNull();
    expect(celdaRoles.querySelectorAll('app-pill').length).toBe(1);
  });

  it('debe mostrar una píldora por rol, etiquetada con el displayName del catálogo', () => {
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
    const celdaRoles = celdas(rows[2])[2];

    expect(celdaRoles.querySelectorAll('app-pill').length).toBe(2);
    expect(celdaRoles.textContent).toContain('Director de Eventos');
    expect(celdaRoles.textContent).toContain('Delegado de Evento');
  });

  it('debe indicar que la asignación de roles se gestiona en Entra ID', () => {
    fixture.detectChanges();

    const infoBanner = fixture.nativeElement.querySelector('.info-banner');
    expect(infoBanner).not.toBeNull();
    expect(infoBanner.textContent).toContain('Microsoft Entra ID');
  });

  it('debe mostrar banner de error con la tabla vacía y permitir reintento', () => {
    apiServiceMock.getDirectory.mockReturnValue(throwError(() => new Error('Network error')));

    fixture.detectChanges();

    expect(component['loading']()).toBe(false);
    expect(component['users']().length).toBe(0);

    const errorBanner = fixture.nativeElement.querySelector('.error-banner');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner.textContent).toContain('No se pudo consultar Microsoft Graph');
    expect(fixture.nativeElement.querySelectorAll('.app-table-row').length).toBe(0);

    // Reintento exitoso
    apiServiceMock.getDirectory.mockReturnValue(of({ users: mockUsers, roles: mockRoles }));
    const retryBtn = fixture.nativeElement.querySelector('.retry-btn');
    retryBtn.click();
    fixture.detectChanges();

    expect(apiServiceMock.getDirectory).toHaveBeenCalledTimes(2);
    expect(component['error']()).toBeNull();
    expect(component['users']().length).toBe(3);
    expect(fixture.nativeElement.querySelector('.error-banner')).toBeNull();
  });

  it('debe explicar que falta el consentimiento cuando MSAL pide interacción', () => {
    apiServiceMock.getDirectory.mockReturnValue(
      throwError(() => new InteractionRequiredAuthError('consent_required', 'corr-1')),
    );

    fixture.detectChanges();

    const mensaje = component['error']();
    expect(mensaje).toContain('Falta el consentimiento del administrador');
    expect(mensaje).toContain('User.Read.All');
    expect(mensaje).toContain('Application.Read.All');
  });

  it('debe mostrar un mensaje específico cuando Graph responde 403 sin ser consentimiento', () => {
    apiServiceMock.getDirectory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })),
    );

    fixture.detectChanges();

    expect(component['error']()).toBe(
      'Tu cuenta no tiene permisos para consultar el directorio de Microsoft Entra ID.',
    );
  });

  it('debe pedir volver a iniciar sesión ante un 401 de Graph', () => {
    apiServiceMock.getDirectory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    fixture.detectChanges();

    expect(component['error']()).toContain('Vuelve a iniciar sesión');
  });

  it('debe filtrar por nombre desde el buscador del toolbar', () => {
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.toolbar-search-input');
    input.value = 'camila';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Camila Rojas');
  });

  it('debe abrir el diálogo de detalle al hacer clic en una fila', () => {
    fixture.detectChanges();

    const firstRow: HTMLElement = fixture.nativeElement.querySelector('.app-table-row');
    firstRow.click();

    expect(dialogMock.open).toHaveBeenCalledWith(
      UserDetailDialogComponent,
      expect.objectContaining({
        data: { user: mockUsers[0], roles: mockRoles },
      }),
    );
  });
});
