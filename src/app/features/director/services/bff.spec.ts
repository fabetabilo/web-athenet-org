import { HttpErrorResponse } from '@angular/common/http';
import { bffErrorMessage, isRetryableBffError } from './bff';

describe('bffErrorMessage', () => {
  const fallback = 'Mensaje por defecto';
  const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

  it('debe resolver 401 y 403 solo por el código HTTP, sin body', () => {
    expect(bffErrorMessage(http(401), fallback)).toContain('sesión expiró');
    expect(bffErrorMessage(http(403), fallback)).toContain('No tienes permisos');
  });

  it('debe mostrar "evento no encontrado" en 404', () => {
    const body = { status: 404, code: 'NOT_FOUND', message: 'El evento EVT-99 no existe.', fieldErrors: [] };
    expect(bffErrorMessage(http(404, body), fallback)).toBe('Evento no encontrado.');
  });

  it('debe mostrar un error temporal en 503', () => {
    const body = { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'ms-events no responde', fieldErrors: [] };
    expect(bffErrorMessage(http(503, body), fallback)).toContain('no está disponible');
  });

  it('debe usar el mensaje del ApiError en otros códigos', () => {
    const body = { status: 409, code: 'CONFLICT', message: 'Ya existe EVT-1.', fieldErrors: [] };
    expect(bffErrorMessage(http(409, body), fallback)).toBe('Ya existe EVT-1.');
  });

  it('debe usar el fallback sin ApiError o si no es un error HTTP', () => {
    expect(bffErrorMessage(http(500, 'texto plano'), fallback)).toBe(fallback);
    expect(bffErrorMessage(new Error('sin sesión'), fallback)).toBe(fallback);
  });
});

describe('isRetryableBffError', () => {
  it('debe ofrecer reintentar solo con 503 o sin respuesta', () => {
    expect(isRetryableBffError(new HttpErrorResponse({ status: 503 }))).toBe(true);
    expect(isRetryableBffError(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isRetryableBffError(new HttpErrorResponse({ status: 404 }))).toBe(false);
    expect(isRetryableBffError(new Error('x'))).toBe(false);
  });
});
