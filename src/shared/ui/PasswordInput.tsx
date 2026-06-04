import { Input } from './Input';
import type { ComponentProps } from 'react';

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  return <Input type="password" autoComplete="current-password" {...props} />;
}
