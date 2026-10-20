import { HttpErrorResponse } from '@angular/common/http';
import { delegateErrorMessage, missingToStart, type DelegateMatch } from './delegate-bff';

describe('delegate-bff', () => {
  const FALLBACK = 'No se pudo iniciar el encuentro.';

  /** `ApiError` del BFF con el `message` de ms-competitions. */
  const apiError = (status: number, code: string, message: string) =>
    new HttpErrorResponse({
      status,
      error: { timestamp: '2026-10-19T12:00:00', status, error: '', code, message, fieldErrors: [] },
    });

  describe('delegateErrorMessage', () => {
    it('debe mostrar el message del 403 cuando el delegado no es el asignado', () => {
      const err = apiError(403, 'FORBIDDEN', 'Solo el delegado asignado puede gestionar el partido 7');
      expect(delegateErrorMessage(err, FALLBACK)).toBe('Solo el delegado asignado puede gestionar el partido 7');
    });

    it('debe usar un texto propio en el 403 sin body (usuario sin el rol)', () => {
      const err = new HttpErrorResponse({ status: 403, error: null });
      expect(delegateErrorMessage(err, FALLBACK)).toBe('No tienes permisos para gestionar este partido.');
    });

    it('debe mostrar el message del 404 y un texto propio si no viene', () => {
      expect(delegateErrorMessage(apiError(404, 'NOT_FOUND', 'Partido 99 no encontrado'), FALLBACK)).toBe(
        'Partido 99 no encontrado',
      );
      expect(delegateErrorMessage(new HttpErrorResponse({ status: 404 }), FALLBACK)).toBe('Partido no encontrado.');
    });

    it('debe mostrar el message de los 409 de ms-competitions', () => {
      const err = apiError(409, 'CONFLICT', 'No se admiten empates: el partido debe tener un ganador');
      expect(delegateErrorMessage(err, FALLBACK)).toBe('No se admiten empates: el partido debe tener un ganador');
    });

    it('debe usar el mensaje genérico en el 502', () => {
      expect(delegateErrorMessage(apiError(502, 'UPSTREAM_ERROR', 'detalle interno'), FALLBACK)).toBe(FALLBACK);
    });

    it('debe delegar el 503 y el 401 en bffErrorMessage', () => {
      expect(delegateErrorMessage(new HttpErrorResponse({ status: 503 }), FALLBACK)).toContain('no está disponible');
      expect(delegateErrorMessage(new HttpErrorResponse({ status: 401 }), FALLBACK)).toContain('sesión expiró');
    });

    it('debe usar el fallback si no es un error HTTP', () => {
      expect(delegateErrorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
    });
  });

  describe('missingToStart', () => {
    const COMPLETE = {
      homeTeam: { id: 1, name: 'USACH', logoUrl: null },
      awayTeam: { id: 2, name: 'UCH', logoUrl: null },
      date: '2026-10-24',
      time: '18:00',
      scheduleConfirmed: true,
    } as DelegateMatch;

    it('no debe faltar nada en un partido completo y confirmado', () => {
      expect(missingToStart(COMPLETE)).toEqual([]);
    });

    it('debe listar equipos, fecha y hora faltantes', () => {
      expect(missingToStart({ ...COMPLETE, awayTeam: null, date: null, time: null })).toEqual([
        'equipos',
        'fecha',
        'hora',
      ]);
    });

    it('debe exigir la confirmación del director aunque esté completo', () => {
      expect(missingToStart({ ...COMPLETE, scheduleConfirmed: false })).toEqual(['confirmación del director']);
    });
  });
});
