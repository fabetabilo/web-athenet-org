import {
  asLocalIsoDate,
  asLocalTime,
  endBeforeStartField,
  parseLocalIsoDate,
  parseLocalTime,
  toLocalIsoDate,
  toLocalTime,
} from './local-date';

describe('local-date', () => {
  // Chile (UTC-3/-4): la zona donde aparecía el desfase de un día. Node aplica
  // el cambio de TZ en caliente; el proyecto no carga los tipos de Node.
  const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
    .process.env;
  const tzOriginal = env['TZ'];
  beforeAll(() => (env['TZ'] = 'America/Santiago'));
  afterAll(() => (env['TZ'] = tzOriginal));

  it('debe correr en la zona horaria de Chile', () => {
    // Octubre en Chile es horario de verano: UTC-3, o sea +180 minutos.
    expect(new Date(2026, 9, 24).getTimezoneOffset()).toBe(180);
  });

  describe('fechas', () => {
    it('debe ir y volver sin perder el día', () => {
      const date = parseLocalIsoDate('2026-10-24')!;
      expect(date.getDate()).toBe(24);
      expect(toLocalIsoDate(date)).toBe('2026-10-24');
    });

    it('debe serializar con el día local, no con el de UTC', () => {
      // 22:30 del 24 en Chile ya es el 25 en UTC: toISOString() daría el 25.
      expect(toLocalIsoDate(new Date(2026, 9, 24, 22, 30))).toBe('2026-10-24');
    });

    it('debe tolerar el día del cambio de horario, que no tiene medianoche local', () => {
      const date = parseLocalIsoDate('2026-09-06')!;
      expect(date).not.toBeNull();
      expect(toLocalIsoDate(date)).toBe('2026-09-06');
    });

    it('debe rechazar formatos inválidos y fechas inexistentes', () => {
      expect(parseLocalIsoDate('24/10/2026')).toBeNull();
      expect(parseLocalIsoDate('2026-02-31')).toBeNull();
      expect(parseLocalIsoDate('')).toBeNull();
      expect(parseLocalIsoDate(null)).toBeNull();
    });
  });

  describe('horas', () => {
    it('debe ir y volver sin perder la hora', () => {
      const time = parseLocalTime('22:00')!;
      expect(time.getHours()).toBe(22);
      expect(time.getMinutes()).toBe(0);
      expect(toLocalTime(time)).toBe('22:00');
    });

    it('debe rechazar formatos inválidos', () => {
      expect(parseLocalTime('25:00')).toBeNull();
      expect(parseLocalTime('9:00')).toBeNull();
      expect(parseLocalTime(undefined)).toBeNull();
    });
  });

  describe('asLocalIsoDate / asLocalTime', () => {
    it('debe aceptar tanto el Date del picker como el string ya serializado', () => {
      expect(asLocalIsoDate(new Date(2026, 9, 24))).toBe('2026-10-24');
      expect(asLocalIsoDate('2026-10-24')).toBe('2026-10-24');
      expect(asLocalIsoDate('basura')).toBeNull();
      expect(asLocalTime(new Date(2026, 9, 24, 18, 5))).toBe('18:05');
      expect(asLocalTime('18:05')).toBe('18:05');
      expect(asLocalTime(null)).toBeNull();
    });
  });

  describe('endBeforeStartField', () => {
    it('debe aceptar un evento que cruza la medianoche', () => {
      expect(endBeforeStartField('2026-10-24', '22:00', '2026-10-25', '00:30')).toBeNull();
    });

    it('debe aceptar un evento de varios días', () => {
      expect(endBeforeStartField('2026-11-06', '09:00', '2026-11-08', '08:00')).toBeNull();
    });

    it('debe marcar endTime si el mismo día termina antes o a la misma hora', () => {
      expect(endBeforeStartField('2026-10-24', '22:00', '2026-10-24', '20:00')).toBe('endTime');
      expect(endBeforeStartField('2026-10-24', '22:00', '2026-10-24', '22:00')).toBe('endTime');
    });

    it('debe marcar endDate si la fecha de término es anterior', () => {
      expect(endBeforeStartField('2026-10-24', '09:00', '2026-10-23', '23:00')).toBe('endDate');
    });

    it('no debe opinar si falta algún dato', () => {
      expect(endBeforeStartField('2026-10-24', null, '2026-10-23', '23:00')).toBeNull();
    });
  });
});
