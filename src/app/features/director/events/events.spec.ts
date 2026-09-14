import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DirectorEventsComponent } from './events';
import {
  DirectorApiService,
  AthenetEvent,
} from '../services/director-api.service';

describe('DirectorEventsComponent', () => {
  let component: DirectorEventsComponent;
  let fixture: ComponentFixture<DirectorEventsComponent>;
  let apiServiceMock: { getEvents: any };

  const mockEvents: AthenetEvent[] = [
    {
      internalId: 'EVT-1',
      title: 'Campeonato Sudamericano',
      category: 'TENIS_MESA',
      eventDate: '2026-09-24',
      status: 'PUBLISHED',
      isOfficial: true,
      location: 'Santiago, Chile',
    },
    {
      internalId: 'EVT-2',
      title: 'Copa Femenina',
      category: 'FUTBOL',
      eventDate: '2026-10-04',
      status: 'DRAFT',
      isOfficial: false,
      location: 'Concepción, Chile',
    },
  ];

  beforeEach(async () => {
    apiServiceMock = {
      getEvents: vi.fn().mockReturnValue(of(mockEvents)),
    };

    await TestBed.configureTestingModule({
      imports: [DirectorEventsComponent],
      providers: [
        provideAnimations(),
        { provide: DirectorApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectorEventsComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y llamar a getEvents() al inicializar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(apiServiceMock.getEvents).toHaveBeenCalledTimes(1);
    expect(component['events']().length).toBe(2);
    expect(component['loading']()).toBe(false);
    expect(component['error']()).toBeNull();
  });

  it('debe renderizar filas en la tabla cuando getEvents() responde con éxito', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.app-table-row');
    expect(rows.length).toBe(2);
  });

  it('debe mostrar banner de error cuando getEvents() falla y permitir reintento', () => {
    apiServiceMock.getEvents.mockReturnValue(
      throwError(() => new Error('Connection refused')),
    );

    fixture.detectChanges();

    expect(component['loading']()).toBe(false);
    expect(component['error']()).not.toBeNull();
    expect(component['events']().length).toBe(0);

    const errorBanner = fixture.nativeElement.querySelector('.error-banner');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner.textContent).toContain('No se pudo conectar con el servidor');

    // Simula reintento exitoso
    apiServiceMock.getEvents.mockReturnValue(of(mockEvents));
    const retryBtn = fixture.nativeElement.querySelector('.retry-btn');
    expect(retryBtn).not.toBeNull();
    retryBtn.click();
    fixture.detectChanges();

    expect(apiServiceMock.getEvents).toHaveBeenCalledTimes(2);
    expect(component['error']()).toBeNull();
    expect(component['events']().length).toBe(2);
  });

  it('debe mapear correctamente etiquetas de categoría y estado', () => {
    expect(component.getCategoryLabel('TENIS_MESA')).toBe('Tenis de Mesa');
    expect(component.getCategoryLabel('FUTBOL')).toBe('Fútbol');
    expect(component.getCategoryLabel('OTRA')).toBe('OTRA');

    expect(component.getStatusLabel('PUBLISHED')).toBe('Publicado');
    expect(component.getStatusLabel('DRAFT')).toBe('Borrador');
    expect(component.getStatusLabel('CANCELLED')).toBe('Cancelado');

    expect(component.getStatusVariant('PUBLISHED')).toBe('success');
    expect(component.getStatusVariant('DRAFT')).toBe('warning');
    expect(component.getStatusVariant('CANCELLED')).toBe('danger');
    expect(component.getStatusVariant('UNKNOWN')).toBe('neutral');
  });

  it('debe renderizar el botón "+ Nuevo Evento" y responder al click', () => {
    fixture.detectChanges();
    const newEventBtn = fixture.nativeElement.querySelector('app-button');
    expect(newEventBtn).toBeTruthy();
    expect(newEventBtn.textContent).toContain('Nuevo Evento');

    const onCreateSpy = vi.spyOn(component, 'onCreateEvent');
    newEventBtn.click();
    expect(onCreateSpy).toHaveBeenCalledTimes(1);
  });
});
