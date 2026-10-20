import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MsalService } from '@azure/msal-angular';
import { Subject, of } from 'rxjs';
import { SESSION_START_KEY, SessionService } from './session.service';
import { environment } from '../../../environments/environment';

/**
 * `vi.useFakeTimers()` también falsea `Date`: eso es lo que hace verificable el
 * recálculo desde el reloj de pared.
 */
describe('SessionService', () => {
  const MINUTOS_ORIGINALES = environment.inactivityMinutes;

  let msalMock: any;
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let dialogClose: ReturnType<typeof vi.fn>;
  let avisoCerrado: Subject<boolean | undefined>;
  let servicios: SessionService[];

  /** El límite se lee en el constructor, así que hay que fijarlo antes de inyectar. */
  function crearServicio(minutos: number | undefined): SessionService {
    environment.inactivityMinutes = minutos as number;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: MsalService, useValue: msalMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    });

    const servicio = TestBed.inject(SessionService);
    servicios.push(servicio);
    return servicio;
  }

  /** En un mismo `window` el navegador no emite `storage`: hay que fabricarlo. */
  function otraPestania(valor: string | null): void {
    if (valor === null) localStorage.removeItem(SESSION_START_KEY);
    else localStorage.setItem(SESSION_START_KEY, valor);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSION_START_KEY,
        newValue: valor,
        storageArea: localStorage,
      }),
    );
  }

  function espiarNavegacion(servicio: SessionService): ReturnType<typeof vi.fn> {
    const interno = servicio as unknown as { navegarAlInicio: () => void };
    return vi.spyOn(interno, 'navegarAlInicio').mockImplementation(() => {}) as never;
  }

  function interactuar(): void {
    document.dispatchEvent(new MouseEvent('click'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new Event('scroll'));
  }

  const cuenta = { homeAccountId: 'home-1', username: 'director@athenet.cl' } as any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T12:00:00'));
    localStorage.clear();

    servicios = [];
    avisoCerrado = new Subject<boolean | undefined>();
    dialogClose = vi.fn(() => avisoCerrado.next(undefined));
    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => avisoCerrado.asObservable(),
        close: dialogClose,
      }),
    };

    msalMock = {
      instance: {
        getActiveAccount: vi.fn().mockReturnValue(cuenta),
        getAllAccounts: vi.fn().mockReturnValue([cuenta]),
        setActiveAccount: vi.fn(),
      },
      logoutRedirect: vi.fn().mockReturnValue(of(undefined)),
      acquireTokenSilent: vi.fn().mockReturnValue(of({ idToken: 'token-fresco' })),
    };
  });

  afterEach(() => {
    for (const servicio of servicios) servicio.stop();
    vi.useRealTimers();
    localStorage.clear();
    environment.inactivityMinutes = MINUTOS_ORIGINALES;
  });

  it('arranca con la ventana completa configurada', () => {
    const servicio = crearServicio(30);
    servicio.start();

    expect(servicio.secondsLeft()).toBe(30 * 60);
    expect(servicio.isWarning()).toBe(false);
    expect(servicio.isCritical()).toBe(false);
  });

  it('no dice advertencia ni crítico antes de arrancar el reloj', () => {
    const servicio = crearServicio(30);

    // Sin start() el reloj no corre, así que los signals no pueden anunciar que
    // la sesión está por caducar.
    expect(servicio.secondsLeft()).toBe(30 * 60);
    expect(servicio.isWarning()).toBe(false);
    expect(servicio.isCritical()).toBe(false);
  });

  describe('umbrales proporcionales a la ventana', () => {
    it('con el valor real de 30 min da 10 y 5 minutos', () => {
      const servicio = crearServicio(30);

      expect(servicio.warningSeconds).toBe(600);
      expect(servicio.criticalSeconds).toBe(300);
    });

    it('se encogen con la ventana en vez de quedar fijos', () => {
      const servicio = crearServicio(10);

      expect(servicio.warningSeconds).toBe(200);
      expect(servicio.criticalSeconds).toBe(100);
    });

    it('con una ventana de 1 min siguen siendo legibles', () => {
      const servicio = crearServicio(1);

      expect(servicio.warningSeconds).toBe(20);
      expect(servicio.criticalSeconds).toBe(10);
      // Y el aviso sigue cayendo dentro de la ventana, no en el segundo cero.
      expect(servicio.criticalSeconds).toBeLessThan(60);
    });
  });

  describe('límite mal configurado', () => {
    it('un valor no numérico cae al defecto de 30 min', () => {
      const servicio = crearServicio(Number.NaN);
      servicio.start();

      expect(servicio.secondsLeft()).toBe(1800);
      expect(servicio.warningSeconds).toBe(600);
      expect(servicio.criticalSeconds).toBe(300);
    });

    it('cero o ausente también caen al defecto', () => {
      expect(crearServicio(0).secondsLeft()).toBe(1800);
      expect(crearServicio(undefined).secondsLeft()).toBe(1800);
    });
  });

  describe('la ventana es fija', () => {
    it('un click, una tecla o un scroll no la extienden', () => {
      const servicio = crearServicio(10);
      servicio.start();

      vi.advanceTimersByTime(60_000);
      expect(servicio.secondsLeft()).toBe(540);

      interactuar();
      vi.advanceTimersByTime(1_000);

      // El contador sigue su curso: la interacción no es una renovación.
      expect(servicio.secondsLeft()).toBe(539);
    });

    it('se agota aunque la interacción no se detenga nunca', () => {
      const servicio = crearServicio(2);
      servicio.start();

      for (let segundo = 0; segundo < 119; segundo++) {
        interactuar();
        vi.advanceTimersByTime(1_000);
      }

      expect(servicio.secondsLeft()).toBe(1);
      expect(msalMock.logoutRedirect).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1_000);
      expect(servicio.secondsLeft()).toBe(0);
      expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
    });
  });

  it('cierra la sesión al vencer la ventana configurada', () => {
    const servicio = crearServicio(2);
    servicio.start();

    vi.advanceTimersByTime(119_000);
    expect(servicio.secondsLeft()).toBe(1);
    expect(msalMock.logoutRedirect).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(servicio.secondsLeft()).toBe(0);
    expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
    // La cuenta activa se limpia antes de redirigir, como hacían los shells.
    expect(msalMock.instance.setActiveAccount).toHaveBeenCalledWith(null);
  });

  it('recalcula desde el reloj de pared y no decrementando', () => {
    const servicio = crearServicio(30);
    servicio.start();

    // Pestaña en segundo plano: el navegador estranguló el intervalo y solo
    // corre un tick después de un minuto de reloj real.
    vi.setSystemTime(Date.now() + 60_000);
    vi.advanceTimersByTime(1_000);

    // Refleja el salto completo (61 s), no el único tick que se ejecutó.
    expect(servicio.secondsLeft()).toBe(30 * 60 - 61);
  });

  it('un salto de reloj mayor que la ventana cierra la sesión en el primer tick', () => {
    const servicio = crearServicio(30);
    servicio.start();

    // El equipo estuvo suspendido una noche entera.
    vi.setSystemTime(Date.now() + 12 * 60 * 60_000);
    vi.advanceTimersByTime(1_000);

    expect(servicio.secondsLeft()).toBe(0);
    expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
  });

  it('abre el aviso en el umbral crítico y una sola vez', () => {
    const servicio = crearServicio(10);
    servicio.start();

    vi.advanceTimersByTime(499_000);
    expect(servicio.secondsLeft()).toBe(101);
    expect(dialogMock.open).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(servicio.secondsLeft()).toBe(servicio.criticalSeconds);
    expect(dialogMock.open).toHaveBeenCalledTimes(1);

    // Pasan treinta ticks más y sigue habiendo un único diálogo.
    vi.advanceTimersByTime(30_000);
    expect(dialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('marca advertencia y estado crítico en sus umbrales', () => {
    const servicio = crearServicio(10);
    servicio.start();
    expect(servicio.isWarning()).toBe(false);

    vi.advanceTimersByTime(399_000);
    expect(servicio.secondsLeft()).toBe(201);
    expect(servicio.isWarning()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(servicio.secondsLeft()).toBe(200);
    expect(servicio.isWarning()).toBe(true);
    expect(servicio.isCritical()).toBe(false);

    vi.advanceTimersByTime(100_000);
    expect(servicio.secondsLeft()).toBe(100);
    expect(servicio.isCritical()).toBe(true);
  });

  it('"Continuar sesión" renueva la ventana sin pedir token', () => {
    const servicio = crearServicio(10);
    servicio.start();

    vi.advanceTimersByTime(560_000);
    expect(dialogMock.open).toHaveBeenCalledTimes(1);

    avisoCerrado.next(true);

    expect(servicio.secondsLeft()).toBe(600);
    expect(msalMock.logoutRedirect).not.toHaveBeenCalled();
    // La vida del token es de Entra ID: este servicio solo cuenta la ventana.
    expect(msalMock.acquireTokenSilent).not.toHaveBeenCalled();

    // Y el aviso vuelve a estar disponible para la ventana siguiente.
    vi.advanceTimersByTime(560_000);
    expect(dialogMock.open).toHaveBeenCalledTimes(2);
  });

  it('"Cerrar sesión" en el aviso cierra la sesión', () => {
    const servicio = crearServicio(10);
    servicio.start();

    vi.advanceTimersByTime(560_000);
    avisoCerrado.next(false);

    expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
  });

  it('cierra el aviso abierto cuando el contador llega a cero', () => {
    const servicio = crearServicio(10);
    servicio.start();

    vi.advanceTimersByTime(560_000);
    expect(dialogMock.open).toHaveBeenCalledTimes(1);

    // Ningún modal huérfano puede quedar sobre la pantalla de login.
    vi.advanceTimersByTime(40_000);
    expect(dialogClose).toHaveBeenCalledTimes(1);
    expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
  });

  it('un "Continuar" que llega después del cierre no resiembra la ventana', () => {
    const servicio = crearServicio(1);
    servicio.start();

    vi.advanceTimersByTime(60_000);
    expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SESSION_START_KEY)).toBeNull();

    // afterClosed() emite tras la animación de salida, cuando el tick de cero
    // ya cerró la sesión.
    avisoCerrado.next(true);

    expect(localStorage.getItem(SESSION_START_KEY)).toBeNull();
    expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
  });

  it('renew() después del cierre no revive el reloj', () => {
    const servicio = crearServicio(2);
    servicio.start();
    servicio.logout();

    servicio.renew();

    expect(localStorage.getItem(SESSION_START_KEY)).toBeNull();
    expect(servicio.secondsLeft()).toBe(120);
  });

  it('el botón de renovar devuelve la ventana completa', () => {
    const servicio = crearServicio(30);
    servicio.start();

    vi.advanceTimersByTime(600_000);
    expect(servicio.secondsLeft()).toBe(1200);

    servicio.renew();

    expect(servicio.secondsLeft()).toBe(1800);
    expect(msalMock.acquireTokenSilent).not.toHaveBeenCalled();
  });

  it('el cierre limpia también la clave del modelo anterior', () => {
    localStorage.setItem('athenet:lastActivity', String(Date.now()));

    const servicio = crearServicio(2);
    servicio.start();
    servicio.logout();

    expect(localStorage.getItem('athenet:lastActivity')).toBeNull();
  });

  describe('el inicio de la ventana quedó en el futuro', () => {
    it('se reancla y el contador sigue bajando', () => {
      // Reloj del equipo movido una hora hacia atrás.
      localStorage.setItem(SESSION_START_KEY, String(Date.now() + 3_600_000));

      const servicio = crearServicio(30);
      servicio.start();

      expect(servicio.secondsLeft()).toBe(1800);
      expect(Number(localStorage.getItem(SESSION_START_KEY))).toBeLessThanOrEqual(Date.now());

      vi.advanceTimersByTime(1_000);
      expect(servicio.secondsLeft()).toBe(1799);
    });

    it('cierra la sesión al vencer la ventana reanclada', () => {
      localStorage.setItem(SESSION_START_KEY, String(Date.now() + 3_600_000));

      const servicio = crearServicio(1);
      servicio.start();
      expect(servicio.secondsLeft()).toBe(60);

      vi.advanceTimersByTime(60_000);
      expect(servicio.secondsLeft()).toBe(0);
      expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
    });
  });

  describe('otra pestaña', () => {
    it('su renovación extiende esta sesión y cierra su aviso', () => {
      const servicio = crearServicio(10);
      servicio.start();

      vi.advanceTimersByTime(560_000);
      expect(dialogMock.open).toHaveBeenCalledTimes(1);

      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
      vi.advanceTimersByTime(1_000);

      expect(servicio.secondsLeft()).toBe(599);
      expect(dialogClose).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(40_000);
      expect(msalMock.logoutRedirect).not.toHaveBeenCalled();
    });

    it('su renovación cierra el aviso al instante, sin esperar el tick', () => {
      const servicio = crearServicio(10);
      servicio.start();

      vi.advanceTimersByTime(560_000);
      expect(dialogMock.open).toHaveBeenCalledTimes(1);

      otraPestania(String(Date.now()));

      expect(dialogClose).toHaveBeenCalledTimes(1);
      expect(servicio.secondsLeft()).toBe(600);
    });

    it('su cierre cierra esta sesión sin un segundo logout contra MSAL', () => {
      const servicio = crearServicio(10);
      const navegar = espiarNavegacion(servicio);
      servicio.start();

      vi.advanceTimersByTime(5_000);
      otraPestania(null);

      expect(navegar).toHaveBeenCalledTimes(1);
      expect(msalMock.logoutRedirect).not.toHaveBeenCalled();

      // El reloj quedó detenido: ya no hay sesión que contar.
      const restantes = servicio.secondsLeft();
      vi.advanceTimersByTime(60_000);
      expect(servicio.secondsLeft()).toBe(restantes);
    });

    it('su cierre también cierra el aviso abierto', () => {
      const servicio = crearServicio(10);
      espiarNavegacion(servicio);
      servicio.start();

      vi.advanceTimersByTime(560_000);
      expect(dialogMock.open).toHaveBeenCalledTimes(1);

      otraPestania(null);

      expect(dialogClose).toHaveBeenCalledTimes(1);
    });

    it('los eventos de otras claves se ignoran', () => {
      const servicio = crearServicio(10);
      const navegar = espiarNavegacion(servicio);
      servicio.start();

      vi.advanceTimersByTime(5_000);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'msal.account.keys',
          newValue: null,
          storageArea: localStorage,
        }),
      );

      expect(navegar).not.toHaveBeenCalled();
      expect(servicio.secondsLeft()).toBe(595);
    });
  });

  describe('arranque sobre una ventana que ya existía', () => {
    it('conserva el tiempo restante al recargar la pestaña', () => {
      // La ventana vigente arrancó hace 10 minutos: recargar no la renueva.
      localStorage.setItem(SESSION_START_KEY, String(Date.now() - 600_000));

      const servicio = crearServicio(30);
      servicio.start();

      expect(servicio.secondsLeft()).toBe(1200);
    });

    it('cierra la sesión si la ventana ya estaba vencida', () => {
      // Se cerró el navegador y se volvió al día siguiente.
      localStorage.setItem(SESSION_START_KEY, String(Date.now() - 24 * 60 * 60_000));

      const servicio = crearServicio(30);
      servicio.start();

      expect(servicio.secondsLeft()).toBe(0);
      expect(msalMock.logoutRedirect).toHaveBeenCalledTimes(1);
      // Y la ventana vencida no queda detrás para hacer bucle en el próximo login.
      expect(localStorage.getItem(SESSION_START_KEY)).toBeNull();
    });
  });

  it('registra un único intervalo aunque se llame a start() varias veces', () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    const servicio = crearServicio(30);

    servicio.start();
    servicio.start();
    servicio.start();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('stop() detiene el reloj y suelta los listeners', () => {
    const servicio = crearServicio(2);
    servicio.start();
    servicio.stop();

    vi.advanceTimersByTime(180_000);

    expect(servicio.secondsLeft()).toBe(120);
    expect(msalMock.logoutRedirect).not.toHaveBeenCalled();
  });

  it('start() revive el reloj si un cierre anterior no llegó a navegar', () => {
    const servicio = crearServicio(2);
    servicio.start();
    servicio.logout();

    // El redirect de logout quedó a medias: montar de nuevo el shell tiene que
    // volver a poner el reloj en marcha, no encontrarlo muerto para siempre.
    servicio.start();
    expect(servicio.secondsLeft()).toBe(120);

    vi.advanceTimersByTime(60_000);
    expect(servicio.secondsLeft()).toBe(60);
  });
});
