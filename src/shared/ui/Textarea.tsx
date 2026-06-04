import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({ label, error, id, ...props }: TextareaProps) {
  const textareaId = id || props.name;

  return (
    <label className="ui-field" htmlFor={textareaId}>
      {label ? <span>{label}</span> : null}
      <textarea id={textareaId} aria-invalid={Boolean(error)} {...props} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
