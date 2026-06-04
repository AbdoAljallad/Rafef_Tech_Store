type ErrorStateProps = {
  title: string;
  description?: string;
};

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <strong>{title}</strong>
      {description ? <p className="muted">{description}</p> : null}
    </div>
  );
}
