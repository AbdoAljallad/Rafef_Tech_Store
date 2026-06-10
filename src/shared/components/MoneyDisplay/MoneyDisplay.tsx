import { useTranslation } from 'react-i18next';

type MoneyDisplayProps = {
  value: number | string;
  currency?: string;
};

export function MoneyDisplay({ value, currency = 'EGP' }: MoneyDisplayProps) {
  const { i18n } = useTranslation();
  const numericValue = typeof value === 'string' ? Number(value) : value;
  const locale = i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'ru-RU';

  return (
    <span className="money-display">
      {new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(Number.isFinite(numericValue) ? numericValue : 0)}
    </span>
  );
}
