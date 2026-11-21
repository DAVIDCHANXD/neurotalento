import { ApiError } from './errors.js';

export function guardianProfile(value) {
  if (!value || !Number.isInteger(value.age) || value.age < 18 || value.age > 120 || value.responsible !== true || !['MOTHER', 'FATHER', 'GUARDIAN'].includes(value.relationship)) throw new ApiError(422, 'Confirma los datos del tutor adulto responsable.');
  return { age: value.age, relationship: value.relationship, responsible: true, verification: 'SELF_DECLARED' };
}
