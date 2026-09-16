import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EventDetailComponent } from './event-detail';
import {
  DirectorApiService,
  type AthenetEvent,
} from '../../services/director-api.service';

describe('EventDetailComponent', () => {
  let component: EventDetailComponent;
  let fixture: ComponentFixture<EventDetailComponent>;

  let paramMapSubject: BehaviorSubject<any>;
  let activatedRouteMock: { paramMap: any };
  let routerMock: { navigate: any };
  let dialogMock: { open: any };
  let directorApiMock: {
    getEventByInternalId: any;
    createEvent: any;
    updateEvent: any;
    deleteEvent: any;
  };

  const mockEvent: AthenetEvent = {
    id: 1,
    internalId: 'EVT-1',
    title: 'Campeonato Sudamericano',
    category: 'TENIS_MESA',
    type: 'TORNEO',
    eventDate: '2026-09-24',
    status: 'PUBLISHED',
    isOfficial: true,
    location: 'Gimnasio Central',
    address: 'Av. Siempre Viva 123',
    description: 'Descripción breve del evento',
    descriptionOpt: 'Descripción extendida del torneo',
    coverImage: 'https://example.com/cover.jpg',
    photos: ['https://example.com/photo1.jpg'],
    organizationId: 5,
    teamOneId: 10,
    teamTwoId: 20,
  };

  function setupTestBed(initialInternalId: string = 'EVT-1', apiError: boolean = false) {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ internalId: initialInternalId }));
    activatedRouteMock = { paramMap: paramMapSubject.asObservable() };

    routerMock = {
      navigate: vi.fn(),
    };

    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      }),
    };

    directorApiMock = {
      getEventByInternalId: vi.fn().mockImplementation(() =>
        apiError ? throwError(() => new Error('Error 500')) : of(mockEvent)
      ),
      createEvent: vi.fn().mockReturnValue(of({ ...mockEvent, id: 99, internalId: 'EVT-NEW' })),
      updateEvent: vi.fn().mockReturnValue(of({ ...mockEvent, title: 'Título Actualizado' })),
      deleteEvent: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [EventDetailComponent],
      providers: [
        provideAnimations(),
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: DirectorApiService, useValue: directorApiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
  }

  describe('Modo Lectura (Carga de evento existente)', () => {
    beforeEach(() => {
      setupTestBed('EVT-1');
      fixture.detectChanges();
    });

    it('debe crearse y llamar a getEventByInternalId al inicializar', () => {
      expect(component).toBeTruthy();
      expect(directorApiMock.getEventByInternalId).toHaveBeenCalledWith('EVT-1');
      expect(component['event']()).toEqual(mockEvent);
      expect(component['isCreateMode']()).toBe(false);
      expect(component['isEdit']()).toBe(false);
      expect(component['loading']()).toBe(false);
    });

    it('debe poblar el formulario con los datos del evento y mantenerlo deshabilitado', () => {
      const form = component['form'];
      expect(form.disabled).toBe(true);
      expect(form.get('internalId')?.value).toBe('EVT-1');
      expect(form.get('title')?.value).toBe('Campeonato Sudamericano');
      expect(form.get('category')?.value).toBe('TENIS_MESA');
      expect(form.get('coverImage')?.value).toBe('https://example.com/cover.jpg');
      expect(form.get('organizationId')?.value).toBe(5);
      expect(component.photosArray.length).toBe(1);
      expect(component.photosArray.at(0).value).toBe('https://example.com/photo1.jpg');
    });

    it('debe mostrar los botones de Editar y Eliminar en la barra de herramientas', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      const texts = Array.from(buttons).map((b: any) => b.textContent.trim());
      expect(texts.some((t: string) => t.includes('Editar'))).toBe(true);
      expect(texts.some((t: string) => t.includes('Eliminar'))).toBe(true);
    });

    it('debe manejar error cuando getEventByInternalId falla', () => {
      setupTestBed('EVT-ERROR', true);
      fixture.detectChanges();

      expect(component['loading']()).toBe(false);
      expect(component['error']()).toContain('No se pudo cargar el evento');
      const banner = fixture.nativeElement.querySelector('.error-banner');
      expect(banner).toBeTruthy();
    });
  });

  describe('Modo Creación (internalId === "new")', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('debe inicializarse en modo creación y edición con formulario habilitado', () => {
      expect(component['isCreateMode']()).toBe(true);
      expect(component['isEdit']()).toBe(true);
      expect(component['form'].enabled).toBe(true);
      expect(component['form'].get('internalId')?.enabled).toBe(true);
      expect(directorApiMock.getEventByInternalId).not.toHaveBeenCalled();
    });

    it('debe renderizar el botón "Crear Evento"', () => {
      const buttons = fixture.nativeElement.querySelectorAll('app-button');
      const texts = Array.from(buttons).map((b: any) => b.textContent.trim());
      expect(texts.some((t: string) => t.includes('Crear Evento'))).toBe(true);
    });
  });

  describe('Validación de Formulario', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('debe marcar todos los controles como touched y no abrir diálogo si el formulario está vacío', () => {
      component.onSave();

      expect(component['form'].invalid).toBe(true);
      expect(component['form'].get('internalId')?.touched).toBe(true);
      expect(component['form'].get('title')?.touched).toBe(true);
      expect(component['form'].get('category')?.touched).toBe(true);
      expect(component['form'].get('type')?.touched).toBe(true);
      expect(component['form'].get('eventDate')?.touched).toBe(true);
      expect(component['form'].get('status')?.touched).toBe(true);
      expect(component['form'].get('coverImage')?.touched).toBe(true);
      expect(component['form'].get('organizationId')?.touched).toBe(true);

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(directorApiMock.createEvent).not.toHaveBeenCalled();
    });

    it('debe validar que coverImage y organizationId sean obligatorios', () => {
      const coverCtrl = component['form'].get('coverImage');
      const orgCtrl = component['form'].get('organizationId');

      expect(coverCtrl?.hasError('required')).toBe(true);
      expect(orgCtrl?.hasError('required')).toBe(true);

      coverCtrl?.setValue('https://example.com/portada.png');
      orgCtrl?.setValue(10);

      expect(coverCtrl?.hasError('required')).toBe(false);
      expect(orgCtrl?.hasError('required')).toBe(false);
    });
  });

  describe('Modo Edición y Descarte (onEdit / onCancelEdit)', () => {
    beforeEach(() => {
      setupTestBed('EVT-1');
      fixture.detectChanges();
    });

    it('onEdit debe habilitar los controles pero mantener internalId deshabilitado', () => {
      component.onEdit();

      expect(component['isEdit']()).toBe(true);
      expect(component['form'].enabled).toBe(true);
      expect(component['form'].get('internalId')?.disabled).toBe(true);
      expect(component['form'].get('title')?.enabled).toBe(true);
    });

    it('onCancelEdit sin cambios debe restaurar el modo lectura sin abrir diálogo', () => {
      component.onEdit();
      component.onCancelEdit();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(component['isEdit']()).toBe(false);
      expect(component['form'].disabled).toBe(true);
    });

    it('onCancelEdit con formulario dirty debe abrir diálogo y descartar si el usuario confirma', () => {
      component.onEdit();
      component['form'].get('title')?.setValue('Nuevo Título Sin Guardar');
      component['form'].get('title')?.markAsDirty();

      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onCancelEdit();

      expect(dialogMock.open).toHaveBeenCalled();
      expect(component['isEdit']()).toBe(false);
      expect(component['form'].get('title')?.value).toBe(mockEvent.title);
      expect(component['form'].disabled).toBe(true);
    });

    it('onCancelEdit con formulario dirty debe permanecer editando si el usuario cancela el descarte', () => {
      component.onEdit();
      component['form'].get('title')?.setValue('Otro Título');
      component['form'].get('title')?.markAsDirty();

      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(false)),
      });

      component.onCancelEdit();

      expect(component['isEdit']()).toBe(true);
      expect(component['form'].get('title')?.value).toBe('Otro Título');
    });
  });

  describe('Creación de Evento (onSave en modo creación)', () => {
    beforeEach(() => {
      setupTestBed('new');
      fixture.detectChanges();
    });

    it('debe abrir diálogo, llamar a createEvent y restaurar a modo lectura tras éxito', () => {
      component['form'].patchValue({
        internalId: 'EVT-NUEVO',
        title: 'Nuevo Evento Válido',
        category: 'FUTBOL',
        type: 'AMISTOSO',
        eventDate: new Date('2026-10-15'),
        status: 'PUBLISHED',
        isOfficial: true,
        coverImage: 'https://example.com/cover.jpg',
        organizationId: 2,
      });

      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onSave();

      expect(dialogMock.open).toHaveBeenCalled();
      expect(directorApiMock.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          internalId: 'EVT-NUEVO',
          title: 'Nuevo Evento Válido',
          eventDate: '2026-10-15',
          coverImage: 'https://example.com/cover.jpg',
          organizationId: 2,
        }),
      );

      expect(component['isCreateMode']()).toBe(false);
      expect(component['isEdit']()).toBe(false);
      expect(component['form'].disabled).toBe(true);
    });
  });

  describe('Actualización de Evento (onSave en modo edición)', () => {
    beforeEach(() => {
      setupTestBed('EVT-1');
      fixture.detectChanges();
      component.onEdit();
    });

    it('debe abrir diálogo, llamar a updateEvent y restaurar a modo lectura', () => {
      component['form'].patchValue({
        title: 'Título Editado y Guardado',
      });

      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onSave();

      expect(dialogMock.open).toHaveBeenCalled();
      expect(directorApiMock.updateEvent).toHaveBeenCalledWith(
        mockEvent.id,
        expect.objectContaining({
          title: 'Título Editado y Guardado',
        }),
      );

      expect(component['isEdit']()).toBe(false);
      expect(component['form'].disabled).toBe(true);
    });

    it('debe registrar error si updateEvent falla', () => {
      directorApiMock.updateEvent.mockReturnValue(throwError(() => new Error('Error al actualizar')));

      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onSave();

      expect(component['isSaving']()).toBe(false);
      expect(component['error']()).toContain('No se pudieron guardar los cambios');
    });
  });

  describe('Eliminación de Evento (onDelete)', () => {
    beforeEach(() => {
      setupTestBed('EVT-1');
      fixture.detectChanges();
    });

    it('debe abrir diálogo de confirmación y llamar a deleteEvent al confirmar', () => {
      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onDelete();

      expect(dialogMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Confirmación de Eliminación',
            variant: 'danger',
          }),
        }),
      );

      expect(directorApiMock.deleteEvent).toHaveBeenCalledWith(mockEvent.id);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/director/events']);
    });

    it('no debe llamar a deleteEvent si el usuario cancela en el diálogo', () => {
      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(false)),
      });

      component.onDelete();

      expect(directorApiMock.deleteEvent).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('debe registrar mensaje de error si deleteEvent falla', () => {
      directorApiMock.deleteEvent.mockReturnValue(throwError(() => new Error('Error')));

      dialogMock.open.mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      });

      component.onDelete();

      expect(component['error']()).toContain('No se pudo eliminar el evento');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('Gestión de Fotos Adicionales (FormArray)', () => {
    beforeEach(() => {
      setupTestBed('EVT-1');
      fixture.detectChanges();
    });

    it('addPhoto debe añadir un nuevo control al FormArray de fotos', () => {
      expect(component.photosArray.length).toBe(1);
      component.addPhoto();
      expect(component.photosArray.length).toBe(2);
      expect(component.photosArray.at(1).value).toBe('');
    });

    it('removePhoto debe eliminar el control en la posición indicada', () => {
      component.addPhoto();
      expect(component.photosArray.length).toBe(2);

      component.removePhoto(0);
      expect(component.photosArray.length).toBe(1);
    });
  });

  describe('Navegación y Utilidades', () => {
    beforeEach(() => {
      setupTestBed('EVT-1');
      fixture.detectChanges();
    });

    it('onBack debe navegar a /director/events', () => {
      component.onBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/director/events']);
    });

    it('getStatusVariant debe retornar el variant correcto para cada estado', () => {
      expect(component['getStatusVariant']('PUBLISHED')).toBe('success');
      expect(component['getStatusVariant']('DRAFT')).toBe('warning');
      expect(component['getStatusVariant']('CANCELLED')).toBe('danger');
      expect(component['getStatusVariant']('OTHER')).toBe('neutral');
    });

    it('getStatusLabel y getCategoryLabel deben resolver etiquetas en español', () => {
      expect(component['getStatusLabel']('PUBLISHED')).toBe('Publicado');
      expect(component['getCategoryLabel']('TENIS_MESA')).toBe('Tenis de Mesa');
    });
  });
});
