import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { PillComponent, PillVariant, PillSize } from './pill';

@Component({
  standalone: true,
  imports: [PillComponent],
  template: `
    <app-pill [variant]="variant()" [dot]="dot()" [icon]="icon()" [size]="size()">
      Texto de prueba
    </app-pill>
  `,
})
class TestHostComponent {
  variant = signal<any>('neutral');
  dot = signal<boolean>(false);
  icon = signal<string | null>(null);
  size = signal<PillSize>('sm');
}

describe('PillComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, PillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y proyectar texto', () => {
    const el: HTMLElement = fixture.nativeElement;
    const label = el.querySelector('.pill-label');
    expect(label?.textContent?.trim()).toBe('Texto de prueba');
  });

  it('debe aplicar la variante por defecto (neutral) y tamaño sm', () => {
    const container = fixture.nativeElement.querySelector('.pill-container');
    expect(container.classList.contains('variant-neutral')).toBe(true);
    expect(container.classList.contains('size-sm')).toBe(true);
  });

  it('debe aplicar variantes semánticas válidas', () => {
    const variants: PillVariant[] = ['success', 'warning', 'danger', 'info', 'neutral'];
    for (const v of variants) {
      host.variant.set(v);
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.pill-container');
      expect(container.classList.contains(`variant-${v}`)).toBe(true);
    }
  });

  it('debe hacer fallback seguro a neutral si la API devuelve una variante inesperada', () => {
    host.variant.set('ESTADO_DESCONOCIDO');
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.pill-container');
    expect(container.classList.contains('variant-neutral')).toBe(true);
  });

  it('debe renderizar el punto luminoso cuando dot = true', () => {
    expect(fixture.nativeElement.querySelector('.pill-dot')).toBeNull();
    host.dot.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill-dot')).not.toBeNull();
  });

  it('debe renderizar el icono de Material cuando se especifica', () => {
    expect(fixture.nativeElement.querySelector('.pill-icon')).toBeNull();
    host.icon.set('verified');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.pill-icon');
    expect(icon).not.toBeNull();
    expect(icon.textContent?.trim()).toBe('verified');
  });

  it('debe soportar tamaño md', () => {
    host.size.set('md');
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.pill-container');
    expect(container.classList.contains('size-md')).toBe(true);
  });
});
