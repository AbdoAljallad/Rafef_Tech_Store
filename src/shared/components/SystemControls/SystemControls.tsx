import { Globe2, SunMedium } from 'lucide-react';

export function SystemControls() {
  return (
    <div className="system-controls" aria-label="Настройки интерфейса">
      <button className="system-control-button" type="button" aria-label="Текущий язык: русский">
        <Globe2 size={16} aria-hidden="true" />
        <span>RU</span>
        <small>Русский</small>
      </button>
      <button className="system-control-button" type="button" aria-label="Текущая тема: светлая">
        <SunMedium size={16} aria-hidden="true" />
        <span>Светлая</span>
      </button>
    </div>
  );
}
