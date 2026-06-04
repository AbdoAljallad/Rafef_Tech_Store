import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export function Select({ label, error, id, children, ...props }: SelectProps) {
  const selectId = id || props.name;

  return (
    <label className="ui-field" htmlFor={selectId}>
      {label ? <span>{label}</span> : null}
      <select id={selectId} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
