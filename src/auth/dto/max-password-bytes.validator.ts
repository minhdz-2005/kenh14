import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { MAX_PASSWORD_BYTES } from '../password.constants';

@ValidatorConstraint({ name: 'maxPasswordBytes', async: false })
export class MaxPasswordBytesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES
    );
  }

  defaultMessage(): string {
    return `password must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes`;
  }
}

export function MaxPasswordBytes(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      target: target.constructor,
      propertyName,
      options,
      validator: MaxPasswordBytesConstraint,
    });
}
