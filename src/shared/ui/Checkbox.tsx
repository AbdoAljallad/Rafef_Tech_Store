import type { InputHTMLAttributes } from 'react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className="ui-checkbox">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
