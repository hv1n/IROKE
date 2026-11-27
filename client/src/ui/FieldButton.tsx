import type { ButtonHTMLAttributes } from 'react';
import calendarIcon from './assets/calendar.svg';
import chevronIcon from './assets/chevron-down.svg';

interface FieldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: 'chevron' | 'calendar';
  /** 고른 값. 없으면 placeholder를 보인다 */
  value?: string;
  placeholder: string;
}

/** 누르면 바텀시트를 여는 입력칸 (시술 종류 ▾ · 시술 날짜 📅) */
export function FieldButton({ icon, value, placeholder, className, type = 'button', ...rest }: FieldButtonProps) {
  return (
    <button type={type} className={`field-button${value ? '' : ' is-placeholder'}${className ? ` ${className}` : ''}`} {...rest}>
      <span>{value || placeholder}</span>
      {icon === 'chevron' ? (
        <img className="field-button__chevron" src={chevronIcon} alt="" />
      ) : (
        <img src={calendarIcon} alt="" />
      )}
    </button>
  );
}
