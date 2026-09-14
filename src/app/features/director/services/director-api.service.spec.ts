import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  DirectorApiService,
  normalizeAthenetEvent,
} from './director-api.service';
import { environment } from '../../../../environments/environment';

describe('DirectorApiService', () => {
  let service: DirectorApiService;
  let httpTesting: HttpTestingController;
  const eventsApiUrl = (environment.eventsApiUrl ?? 'http://localhost:8080').replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DirectorApiService,
      ],
    });

    service = TestBed.inject(DirectorApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe crearse correctamente y resolver eventsApiUrl limpia', () => {
    expect(service).toBeTruthy();
    expect(service.getEventsApiUrl()).toBe(eventsApiUrl);
  });

  describe('normalizeAthenetEvent', () => {
    it('debe normalizar respuestas con claves camelCase', () => {
      const raw = {
        internalId: 'EVT-1',
        title: 'Torneo',
        category: 'FUTBOL',
        eventDate: '2026-10-01',
        status: 'PUBLISHED',
        isOfficial: true,
        location: 'Campus San Joaquín',
      };
      const result = normalizeAthenetEvent(raw);
      expect(result.internalId).toBe('EVT-1');
      expect(result.title).toBe('Torneo');
      expect(result.isOfficial).toBe(true);
      expect(result.status).toBe('PUBLISHED');
    });

    it('debe normalizar respuestas con claves snake_case de base de datos', () => {
      const raw = {
        internal_id: 'EVT-SQL-9',
        title: 'Copa Interfacultades',
        category: 'VOLEIBOL',
        event_date: '2026-11-20',
        status: 'PUBLISHED',
        is_official_flag: true,
        location: 'Gimnasio Central',
        description_opt: 'Descripción detallada',
      };
      const result = normalizeAthenetEvent(raw);
      expect(result.internalId).toBe('EVT-SQL-9');
      expect(result.eventDate).toBe('2026-11-20');
      expect(result.isOfficial).toBe(true);
      expect(result.description).toBe('Descripción detallada');
    });

    it('debe manejar objetos vacíos o nulos de forma segura', () => {
      const result = normalizeAthenetEvent(null);
      expect(result.internalId).toBe('');
      expect(result.status).toBe('DRAFT');
      expect(result.isOfficial).toBe(false);
    });
  });

  describe('getEvents', () => {
    it('debe realizar petición GET a /api/public/events y retornar eventos normalizados', () => {
      const mockBackendResponse = [
        {
          internal_id: 'EVT-1',
          title: 'Campeonato Sudamericano',
          category: 'TENIS_MESA',
          event_date: '2026-09-24',
          status: 'PUBLISHED',
          is_official_flag: true,
          location: 'Santiago, Chile',
        },
      ];

      service.getEvents().subscribe((events) => {
        expect(events.length).toBe(1);
        expect(events[0].internalId).toBe('EVT-1');
        expect(events[0].title).toBe('Campeonato Sudamericano');
        expect(events[0].isOfficial).toBe(true);
      });

      const req = httpTesting.expectOne(`${eventsApiUrl}/api/public/events`);
      expect(req.request.method).toBe('GET');
      req.flush(mockBackendResponse);
    });

    it('debe soportar respuestas con envoltorio paginado (content)', () => {
      const mockPagedResponse = {
        content: [
          {
            internalId: 'EVT-PAGED',
            title: 'Evento Paginado',
            category: 'AJEDREZ',
            eventDate: '2026-12-01',
            status: 'PUBLISHED',
            isOfficial: false,
            location: 'Online',
          },
        ],
        totalElements: 1,
      };

      service.getEvents().subscribe((events) => {
        expect(events.length).toBe(1);
        expect(events[0].internalId).toBe('EVT-PAGED');
      });

      const req = httpTesting.expectOne(`${eventsApiUrl}/api/public/events`);
      req.flush(mockPagedResponse);
    });

    it('debe propagar el error HTTP cuando la API falla', () => {
      let errorOccurred = false;

      service.getEvents().subscribe({
        next: () => {
          throw new Error('No debería tener éxito ante un error 500');
        },
        error: (err) => {
          errorOccurred = true;
          expect(err.status).toBe(500);
        },
      });

      const req = httpTesting.expectOne(`${eventsApiUrl}/api/public/events`);
      req.flush('Error interno del servidor', { status: 500, statusText: 'Server Error' });
      expect(errorOccurred).toBe(true);
    });
  });
});
