import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog';

/** Inicio de la ventana vigente en `localStorage` para compartirla entre pestañas.*/
export const SESSION_START_KEY = 'athenet:sessionStart';

/** Clave del modelo anterior, basado en actividad. Quitar en unas semanas. */
const LEGACY_ACTIVITY_KEY = 'athenet:lastActivity';
const TICK_MS = 1_000;
const DEFAULT_INACTIVITY_MINUTES = 30;

/** Para hacer flexible wl warning y critical si cambia `environment.inactivityMinutes` */
const WARNING_FRACTION = 1 / 3;
const CRITICAL_FRACTION = 1 / 6;

/** Pisos de seguridad: solo cuentan si baja el mínimo de 1 min de `resolverLimiteMs`. */
const WARNING_FLOOR_SECONDS = 20;
const CRITICAL_FLOOR_SECONDS = 10;

/** Una configuración rota no puede desarmar el reloj en silencio. */
function resolverLimiteMs(minutos: unknown): number {
  const valor = Number(minutos);
  const validos = Number.isFinite(valor) && valor > 0 ? valor : DEFAULT_INACTIVITY_MINUTES;
  return Math.max(1, validos) * 60_000;
}

/**
 * Dueño único del reloj de sesión. La ventana es fija: dura
 * `environment.inactivityMinutes` desde el login y solo la extienden el botón
 * de renovar y el "Continuar sesión" del aviso, nunca la actividad del DOM.
 * El token no se toca aquí: su vida la fija EXCLUSIVAMENTE Entra ID.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly zone = inject(NgZone);
  private readonly dialog = inject(MatDialog, { optional: true });
  private readonly authService = inject(MsalService, { optional: true });

  private readonly limitMs = resolverLimiteMs(environment.inactivityMinutes);

  readonly warningSeconds = Math.max(
    Math.round((this.limitMs / 1000) * WARNING_FRACTION),
    WARNING_FLOOR_SECONDS,
  );

  /** Umbral del aviso previo y del estado crítico del contador. */
  readonly criticalSeconds = Math.max(
    Math.round((this.limitMs / 1000) * CRITICAL_FRACTION),
    CRITICAL_FLOOR_SECONDS,
  );

  /**
   * Arranca en la ventana completa y no en cero: antes de `start()` el reloj no
   * corre, y un cero daría `isWarning()` e `isCritical()` en `true`.
   */
  readonly secondsLeft = signal<number>(Math.round(this.limitMs / 1000));
  readonly isWarning = computed(() => this.secondsLeft() <= this.warningSeconds);
  readonly isCritical = computed(() => this.secondsLeft() <= this.criticalSeconds);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** Respaldo para cuando `localStorage` no está disponible (modo privado). */
  private inicioFallback = Date.now();

  private avisoRef: MatDialogRef<ConfirmDialogComponent, boolean> | null = null;

  /** Una sola apertura del aviso por ventana. */
  private avisoMostrado = false;

  private cerrando = false;

  // Referencias estables para desregistrar los listeners en stop().
  private readonly onWake = () => this.zone.run(() => this.tick());

  /**
   * La ventana compartida también avisa del cierre: si otra pestaña la borra,
   * esta sesión ya no existe. `key === null` es `localStorage.clear()`.
   */
  private readonly onStorage = (evento: StorageEvent) => {
    if (evento.key !== null && evento.key !== SESSION_START_KEY) return;
    this.zone.run(() => {
      if (evento.newValue === null) this.cerrarPorOtraPestania();
      else this.tick();
    });
  };

  /** Idempotente: remontar la barra superior no duplica el intervalo ni los listeners. */
  start(): void {
    if (this.intervalId !== null) return;

    // Si un cierre anterior no llegó a navegar, el reloj no puede quedar muerto.
    this.cerrando = false;

    // Se respeta la ventana que ya exista: si recargar sembrara una nueva, la
    // recarga sería una renovación encubierta.
    if (this.leerInicioPersistido() === null) {
      this.reiniciarVentana();
    }

    this.zone.runOutsideAngular(() => {
      // Si el equipo se suspende ningún timer corre: al volver hay que reevaluar.
      document.addEventListener('visibilitychange', this.onWake);
      window.addEventListener('focus', this.onWake);
      window.addEventListener('storage', this.onStorage);
    });

    this.zone.run(() => {
      this.intervalId = setInterval(() => this.tick(), TICK_MS);
    });

    this.tick();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('focus', this.onWake);
    window.removeEventListener('storage', this.onStorage);
  }

  /** Única forma de extender la sesión: el botón del temporizador y "Continuar sesión". */
  renew(): void {
    // Un "Continuar" que llega tarde no puede resembrar la ventana que logout() borró.
    if (this.cerrando) return;

    this.reiniciarVentana();
    this.cerrarAviso();
    this.tick();
  }

  /** Único punto de cierre: los dos shells, el aviso previo y el vencimiento. */
  logout(): void {
    if (this.cerrando) return;
    this.cerrando = true;

    this.cerrarAviso();
    this.stop();
    this.borrarVentana();

    // La cuenta se lee antes de limpiarla: MSAL necesita saber qué sesión cerrar.
    const account = this.authService?.instance.getActiveAccount();
    this.authService?.instance.setActiveAccount(null);
    this.authService
      ?.logoutRedirect({
        postLogoutRedirectUri: environment.redirectUri,
        account: account ?? undefined,
      })
      .subscribe();
  }

  /**
   * Otra pestaña ya cerró la sesión. No se vuelve a llamar a MSAL: su caché ya
   * quedó limpia y un segundo `logoutRedirect` solo agrega una ida a Microsoft
   * y riesgo de `interaction_in_progress`.
   */
  private cerrarPorOtraPestania(): void {
    if (this.cerrando) return;
    this.cerrando = true;

    this.cerrarAviso();
    this.stop();
    this.navegarAlInicio();
  }

  /** Aislado para espiarlo en pruebas: jsdom no implementa la navegación real. */
  private navegarAlInicio(): void {
    window.location.assign(environment.redirectUri);
  }

  /**
   * Se recalcula desde el reloj de pared en vez de decrementar: decrementar
   * deriva y, con la pestaña en segundo plano, el navegador estrangula el
   * intervalo a uno por minuto o menos.
   */
  private tick(): void {
    if (this.cerrando || this.intervalId === null) return;

    const deadline = this.leerInicioVentana() + this.limitMs;
    const restantes = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    this.secondsLeft.set(restantes);

    if (restantes === 0) {
      this.logout();
      return;
    }

    if (restantes <= this.criticalSeconds) {
      if (!this.avisoMostrado) this.abrirAviso();
      return;
    }

    // Por encima del umbral hubo una renovación —aquí o en otra pestaña— y la
    // ventana empieza de nuevo.
    this.avisoMostrado = false;
    this.cerrarAviso();
  }

  private reiniciarVentana(): void {
    this.escribirInicioVentana(Date.now());
    this.avisoMostrado = false;
  }

  private abrirAviso(): void {
    this.avisoMostrado = true;
    if (!this.dialog) return;

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: '¿Sigues ahí?',
          message: 'Tu sesión está por vencer',
          description:
            'Pulsa continuar para renovarla. Los cambios sin guardar se perderán al cerrarse.',
          confirmText: 'Continuar sesión',
          cancelText: 'Cerrar sesión',
          variant: 'warning',
          icon: 'schedule',
        },
        width: '460px',
        maxWidth: '92vw',
        panelClass: 'athenet-dialog-panel',
        // Sin salida por backdrop ni Esc: las dos opciones son explícitas.
        disableClose: true,
      },
    );

    this.avisoRef = ref;

    ref.afterClosed().subscribe((resultado) => {
      this.avisoRef = null;

      if (resultado === true) {
        this.renew();
      } else if (resultado === false) {
        this.logout();
      }
      // undefined: lo cerró el servicio y ese camino ya hizo lo que tocaba.
    });
  }

  private cerrarAviso(): void {
    const ref = this.avisoRef;
    if (!ref) return;
    this.avisoRef = null;
    ref.close();
  }

  private leerInicioVentana(): number {
    const ahora = Date.now();
    const inicio = this.leerInicioPersistido() ?? this.inicioFallback;

    // Reloj movido hacia atrás. Se reancla una vez y no se clampa en cada
    // lectura: el clamp daría deadline = ahora + limitMs en todos los ticks y
    // la sesión no cerraría nunca.
    if (inicio > ahora) {
      this.escribirInicioVentana(ahora);
      return ahora;
    }

    return inicio;
  }

  private leerInicioPersistido(): number | null {
    try {
      const guardado = Number(localStorage.getItem(SESSION_START_KEY));
      return Number.isFinite(guardado) && guardado > 0 ? guardado : null;
    } catch {
      // localStorage bloqueado: queda el respaldo en memoria.
      return null;
    }
  }

  private escribirInicioVentana(ahora: number): void {
    this.inicioFallback = ahora;
    try {
      localStorage.setItem(SESSION_START_KEY, String(ahora));
    } catch {}
  }

  private borrarVentana(): void {
    try {
      localStorage.removeItem(SESSION_START_KEY);
      localStorage.removeItem(LEGACY_ACTIVITY_KEY);
    } catch {}
  }
}
