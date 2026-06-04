type MoneyDisplayProps = {
  value: number | string;
  currency?: string;
};

export function MoneyDisplay({ value, currency = 'EGP' }: MoneyDisplayProps) {
  const numericValue = typeof value === 'string' ? Number(value) : value;

  return (
    <span className="money-display">
      {new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(Number.isFinite(numericValue) ? numericValue : 0)}
    </span>
  );
}
