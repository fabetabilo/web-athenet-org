import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { TopbarComponent } from './topbar';
import { SessionService } from '../../services/session.service';

describe('TopbarComponent', () => {
  let fixture: ComponentFixture<TopbarComponent>;
  let el: HTMLElement;
  let startMock: ReturnType<typeof vi.fn>;

  /** El panel del menú vive en el overlay del CDK, fuera del host del componente. */
  const panel = () => document.querySelector('.profile-menu') as HTMLElement | null;

  function abrirMenu(): void {
    (el.querySelector('.profile-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    startMock = vi.fn();

    // El topbar arranca el reloj y el timer hijo lee sus signals.
    const secondsLeft = signal(1800);
    const sessionMock = {
      secondsLeft,
      warningSeconds: 300,
      criticalSeconds: 120,
      isWarning: computed(() => secondsLeft() <= 300),
      isCritical: computed(() => secondsLeft() <= 120),
      renew: vi.fn(),
      start: startMock,
      stop: vi.fn(),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [{ provide: SessionService, useValue: sessionMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    fixture.componentRef.setInput('accountName', 'Juan Herrera');
    fixture.componentRef.setInput('userRole', 'Director');
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('arranca el reloj de sesión al montarse', () => {
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it('muestra la inicial del usuario en el badge de perfil', () => {
    expect(el.querySelector('.profile-trigger .avatar')?.textContent?.trim()).toBe('J');
  });

  it('el menú de perfil muestra nombre y rol', () => {
    abrirMenu();

    expect(panel()?.querySelector('.profile-name')?.textContent?.trim()).toBe('Juan Herrera');
    expect(panel()?.querySelector('.profile-role')?.textContent?.trim()).toBe('Director');
  });

  it('"Cerrar sesión" del menú emite logoutClick', () => {
    const logoutSpy = vi.fn();
    fixture.componentInstance.logoutClick.subscribe(logoutSpy);
    abrirMenu();

    const items = Array.from(panel()?.querySelectorAll<HTMLButtonElement>('.profile-menu-item') ?? []);
    items.find((item) => item.textContent?.includes('Cerrar sesión'))?.click();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
