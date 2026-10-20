import { FormControl, Validators } from '@angular/forms';
import { controlErrorMessage } from './control-error';

describe('controlErrorMessage', () => {
  it('debe traducir los errores locales conocidos', () => {
    const control = new FormControl<string | null>(null, Validators.required);
    expect(controlErrorMessage(control)).toBe('Este campo es obligatorio.');
    control.setErrors({ divisionMismatch: true });
    expect(controlErrorMessage(control)).toBe('Los equipos deben ser de la misma división.');
  });

  it('debe devolver null si el control es válido', () => {
    expect(controlErrorMessage(new FormControl('ok'))).toBeNull();
    expect(controlErrorMessage(null)).toBeNull();
  });
});
