import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  UserDetailDialogComponent,
  type UserDetailDialogData,
} from './user-detail-dialog';
import type { AppRole, AthenetUser } from '../../services/user-api.service';

describe('UserDetailDialogComponent', () => {
  let fixture: ComponentFixture<UserDetailDialogComponent>;
  let dialogRefMock: { close: any };

  const roles: AppRole[] = [
    { code: 'director', displayName: 'Director de Eventos', description: 'Programación y fiscalización.' },
    { code: 'delegate', displayName: 'Delegado de Evento', description: 'Certifica un evento.' },
  ];

  const usuario = (parcial: Partial<AthenetUser> = {}): AthenetUser => ({
    id: 'oid-1',
    displayName: 'Camila Rojas',
    userPrincipalName: 'camila@tenant.onmicrosoft.com',
    mail: 'camila@tenant.onmicrosoft.com',
    accountEnabled: true,
    roles: ['director'],
    ...parcial,
  });

  const montar = async (data: UserDetailDialogData) => {
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UserDetailDialogComponent],
      providers: [
        provideAnimations(),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailDialogComponent);
    fixture.detectChanges();
  };

  it('debe mostrar el correo con fallback — cuando la cuenta no tiene buzón', async () => {
    await montar({ user: usuario({ mail: null }), roles });

    const valores = Array.from(
      fixture.nativeElement.querySelectorAll('.detail-value'),
    ).map((el: any) => el.textContent.trim());

    expect(valores[0]).toBe('—');
  });

  it('debe listar cada rol con su displayName y su description del catálogo', async () => {
    await montar({ user: usuario({ roles: ['director', 'delegate'] }), roles });

    const items = fixture.nativeElement.querySelectorAll('.role-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Director de Eventos');
    expect(items[0].textContent).toContain('Programación y fiscalización.');
    expect(items[1].textContent).toContain('Delegado de Evento');
  });

  it('debe distinguir al usuario sin rol asignado', async () => {
    await montar({ user: usuario({ roles: [] }), roles });

    expect(fixture.nativeElement.querySelector('.roles-list')).toBeNull();
    const vacio = fixture.nativeElement.querySelector('.roles-empty');
    expect(vacio).not.toBeNull();
    expect(vacio.textContent).toContain('Sin rol asignado');
  });

  it('debe mostrar el código del rol si no está en el catálogo', async () => {
    await montar({ user: usuario({ roles: ['auditor'] }), roles });

    const item = fixture.nativeElement.querySelector('.role-item');
    expect(item.textContent).toContain('auditor');
  });

  it('debe cerrarse sin resultado', async () => {
    await montar({ user: usuario(), roles });

    fixture.componentInstance.onClose();
    expect(dialogRefMock.close).toHaveBeenCalledTimes(1);
  });
});
