import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ButtonComponent, ButtonVariant, ButtonSize } from './button';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <app-button
      [variant]="variant()"
      [size]="size()"
      [icon]="icon()"
      [iconPosition]="iconPosition()"
      [loading]="loading()"
      [disabled]="disabled()"
      (click)="onClick()"
    >
      Acción
    </app-button>
  `,
})
class TestHostComponent {
  variant = signal<ButtonVariant>('primary');
  size = signal<ButtonSize>('md');
  icon = signal<string | null>(null);
  iconPosition = signal<'start' | 'end'>('start');
  loading = signal<boolean>(false);
  disabled = signal<boolean>(false);
  clickCount = 0;

  onClick(): void {
    this.clickCount++;
  }
}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con valores por defecto', () => {
    const buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));
    expect(buttonEl).toBeTruthy();
    expect(buttonEl.nativeElement.classList.contains('variant-primary')).toBe(true);
    expect(buttonEl.nativeElement.classList.contains('size-md')).toBe(true);
    expect(buttonEl.nativeElement.disabled).toBe(false);
  });

  it('debe aplicar variantes correctamente (danger, secondary, ghost)', () => {
    host.variant.set('danger');
    fixture.detectChanges();
    let buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));
    expect(buttonEl.nativeElement.classList.contains('variant-danger')).toBe(true);

    host.variant.set('secondary');
    fixture.detectChanges();
    buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));
    expect(buttonEl.nativeElement.classList.contains('variant-secondary')).toBe(true);

    host.variant.set('ghost');
    fixture.detectChanges();
    buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));
    expect(buttonEl.nativeElement.classList.contains('variant-ghost')).toBe(true);
  });

  it('debe aplicar tamaños correctamente (sm, lg)', () => {
    host.size.set('sm');
    fixture.detectChanges();
    let buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));
    expect(buttonEl.nativeElement.classList.contains('size-sm')).toBe(true);

    host.size.set('lg');
    fixture.detectChanges();
    buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));
    expect(buttonEl.nativeElement.classList.contains('size-lg')).toBe(true);
  });

  it('debe renderizar un mat-icon cuando se especifica icon', () => {
    host.icon.set('add');
    fixture.detectChanges();
    const iconEl = fixture.debugElement.query(By.css('mat-icon.btn-icon'));
    expect(iconEl).toBeTruthy();
    expect(iconEl.nativeElement.textContent.trim()).toBe('add');
  });

  it('debe mostrar spinner y ocultar icono cuando loading es true', () => {
    host.icon.set('add');
    host.loading.set(true);
    fixture.detectChanges();

    const spinnerEl = fixture.debugElement.query(By.css('.btn-spinner'));
    const iconEl = fixture.debugElement.query(By.css('mat-icon.btn-icon'));
    const buttonEl = fixture.debugElement.query(By.css('button.app-btn-inner'));

    expect(spinnerEl).toBeTruthy();
    expect(iconEl).toBeNull();
    expect(buttonEl.nativeElement.disabled).toBe(true);
  });

  it('debe disparar evento click cuando no está deshabilitado ni cargando', () => {
    const hostEl = fixture.debugElement.query(By.css('app-button'));
    hostEl.nativeElement.click();
    expect(host.clickCount).toBe(1);
  });

  it('no debe disparar evento click cuando disabled es true', () => {
    host.disabled.set(true);
    fixture.detectChanges();

    const hostEl = fixture.debugElement.query(By.css('app-button'));
    hostEl.nativeElement.click();
    expect(host.clickCount).toBe(0);
  });

  it('no debe disparar evento click cuando loading es true', () => {
    host.loading.set(true);
    fixture.detectChanges();

    const hostEl = fixture.debugElement.query(By.css('app-button'));
    hostEl.nativeElement.click();
    expect(host.clickCount).toBe(0);
  });
});
