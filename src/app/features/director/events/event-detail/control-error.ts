import type { AbstractControl } from '@angular/forms';

const CONTROL_ERROR_MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  sameTeam: 'Un equipo no puede enfrentarse a sí mismo.',
  divisionMismatch: 'Los equipos deben ser de la misma división.',
  endBeforeStart: 'El término debe ser posterior al inicio.',
  startAfterEnd: 'La fecha de inicio no puede ser posterior a la de término.',
  endDateBeforeStart: 'La fecha de término no puede ser anterior a la de inicio.',
  maxlength: 'Supera el largo máximo permitido.',
  alreadyEnrolled: 'El equipo ya está inscrito en la copa.',
  matchNotAllowed: 'Los partidos se gestionan desde Competencias.',
  matDatepickerParse: 'Fecha inválida.',
  matTimepickerParse: 'Hora inválida.',
};

/** Texto del `mat-error` según el primer error conocido del control. */
export function controlErrorMessage(control: AbstractControl | null | undefined): string | null {
  const errors = control?.errors;
  if (!errors) return null;
  const key = Object.keys(CONTROL_ERROR_MESSAGES).find((k) => errors[k]);
  return key ? CONTROL_ERROR_MESSAGES[key] : 'Valor inválido.';
}
