import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const ROOM_CODE_PATTERN = /^\d{6}$/;

export function isValidRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}

export const roomCodeValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  if (!control.value) {
    return null;
  }
  return isValidRoomCode(control.value) ? null : { roomCode: true };
};
