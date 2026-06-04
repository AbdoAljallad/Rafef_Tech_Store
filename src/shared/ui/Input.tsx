import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="ui-field" htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      <input id={inputId} aria-invalid={Boolean(error)} {...props} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
