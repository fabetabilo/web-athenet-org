import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, type ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  const defaultMockData: ConfirmDialogData = {
    title: 'Confirmación de Eliminación',
    message: 'Estás a punto de eliminar el evento',
    targetName: 'Torneo Apertura 2026',
    description: 'Esta acción no se puede revertir.',
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    variant: 'danger',
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: defaultMockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
    expect(component.safeVariant).toBe('danger');
  });

  it('debe renderizar el título, mensaje, entidad targetName y descripción', () => {
    const el = fixture.nativeElement as HTMLElement;
    const title = el.querySelector('.dialog-title')?.textContent?.trim();
    const message = el.querySelector('.dialog-message')?.textContent?.trim();
    const subtext = el.querySelector('.dialog-subtext')?.textContent?.trim();

    expect(title).toBe('Confirmación de Eliminación');
    expect(message).toContain('Torneo Apertura 2026');
    expect(subtext).toBe('Esta acción no se puede revertir.');
  });

  it('debe llamar a dialogRef.close(false) al hacer click en Cancelar', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('debe llamar a dialogRef.close(true) al hacer click en Confirmar/Eliminar', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('debe funcionar como un submit-dialog para creación de eventos con variante primary', async () => {
    const submitMockData: ConfirmDialogData = {
      title: 'Confirmar Creación de Evento',
      message: '¿Estás seguro de registrar y publicar el evento?',
      targetName: 'Copa Universitaria 2026',
      description: 'El evento quedará visible de inmediato en el portal.',
      confirmText: 'Crear Evento',
      confirmVariant: 'primary',
      confirmIcon: 'add',
      cancelText: 'Seguir editando',
      variant: 'primary',
      icon: 'rocket_launch',
    };

    const submitFixture = TestBed.createComponent(ConfirmDialogComponent);
    const submitComp = submitFixture.componentInstance;
    // Inyecta datos de submit
    (submitComp as any).data = submitMockData;
    submitFixture.detectChanges();

    expect(submitComp.safeVariant).toBe('primary');
    const el = submitFixture.nativeElement as HTMLElement;
    expect(el.querySelector('.dialog-title')?.textContent?.trim()).toBe('Confirmar Creación de Evento');
    expect(el.querySelector('.dialog-message')?.textContent?.trim()).toContain('Copa Universitaria 2026');
  });
});
