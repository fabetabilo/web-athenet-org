import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { SessionTimerComponent } from './session-timer';
import { SessionService } from '../../services/session.service';

// Umbrales de un ciclo de 30 min, el valor de produccion: el servicio los
// calcula desde el limite, y el mock los fija para no depender del entorno.
const WARNING_SECONDS = 300;
const CRITICAL_SECONDS = 120;

describe('SessionTimerComponent', () => {
  let fixture: ComponentFixture<SessionTimerComponent>;
  let el: HTMLElement;
  let secondsLeft: ReturnType<typeof signal<number>>;
  let renewMock: ReturnType<typeof vi.fn>;

  /** El componente es presentacional: el reloj se simula con un signal. */
  function render(segundos: number): void {
    secondsLeft.set(segundos);
    fixture.detectChanges();
  }

  const valor = () => el.querySelector('.timer-value')?.textContent?.trim();
  const pill = () => el.querySelector('.session-timer') as HTMLElement;

  beforeEach(async () => {
    secondsLeft = signal(0);
    renewMock = vi.fn(() => secondsLeft.set(1800));

    const sessionMock = {
      secondsLeft,
      warningSeconds: WARNING_SECONDS,
      criticalSeconds: CRITICAL_SECONDS,
      isWarning: computed(() => secondsLeft() <= WARNING_SECONDS),
      isCritical: computed(() => secondsLeft() <= CRITICAL_SECONDS),
      renew: renewMock,
      start: vi.fn(),
      stop: vi.fn(),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SessionTimerComponent],
      providers: [{ provide: SessionService, useValue: sessionMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTimerComponent);
    el = fixture.nativeElement as HTMLElement;
  });

  it('formatea el tiempo restante en MM:SS', () => {
    render(1471);
    expect(valor()).toBe('24:31');
  });

  it('rellena con cero a la izquierda', () => {
    render(65);
    expect(valor()).toBe('01:05');

    render(9);
    expect(valor()).toBe('00:09');

    render(0);
    expect(valor()).toBe('00:00');
  });

  it('dice "Sesión" y nunca "Token"', () => {
    render(1800);
    const texto = el.textContent ?? '';
    expect(texto).toContain('Sesión');
    expect(texto.toLowerCase()).not.toContain('token');
  });

  it('no aplica estados de color por encima de 5 minutos', () => {
    render(301);
    expect(pill().classList.contains('is-warning')).toBe(false);
    expect(pill().classList.contains('is-critical')).toBe(false);
  });

  it('aplica la clase de advertencia bajo 5 minutos', () => {
    render(300);
    expect(pill().classList.contains('is-warning')).toBe(true);
    expect(pill().classList.contains('is-critical')).toBe(false);
  });

  it('aplica la clase crítica bajo 2 minutos', () => {
    render(120);
    expect(pill().classList.contains('is-critical')).toBe(true);
  });

  it('el número que corre no se anuncia en cada segundo', () => {
    render(1800);
    // Un contador anunciado cada segundo hace inusable un lector de pantalla.
    expect(el.querySelector('.timer-value')?.getAttribute('aria-live')).toBe('off');
  });

  it('el botón de renovar reinicia el contador', () => {
    render(240);
    expect(valor()).toBe('04:00');

    const boton = el.querySelector('.timer-renew') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();

    expect(renewMock).toHaveBeenCalledTimes(1);
    expect(valor()).toBe('30:00');
    expect(pill().classList.contains('is-warning')).toBe(false);
  });
});
