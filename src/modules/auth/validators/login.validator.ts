import type { LoginRequest } from '../types/auth.types';

export type LoginValidationErrors = Partial<Record<keyof LoginRequest, string>>;

export function validateLogin(values: LoginRequest): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!values.username.trim()) {
    errors.username = 'required';
  }

  if (!values.password.trim()) {
    errors.password = 'required';
  }

  return errors;
}
