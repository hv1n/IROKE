import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clearIcon from './assets/input-clear.svg';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** 오른쪽 X로 지우기 */
  clearable?: boolean;
  /** 왼쪽 아이콘 (₩ 등) */
  icon?: ReactNode;
  /** 오른쪽 단위 (만원) */
  suffix?: string;
  error?: string;
}

/** 56px 입력칸 (Figma 디자이너 등록·응답 보내기). 포커스되면 갈색 테두리·라벨 */
export function TextField({ label, value, onChange, clearable, icon, suffix, error, className, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <div className={`u-field${error ? ' has-error' : ''}${className ? ` ${className}` : ''}`}>
      {label && (
        <label className="u-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="u-field__box">
        {icon}
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} {...rest} />
        {suffix && <span className="u-field__suffix">{suffix}</span>}
        {clearable && value && (
          <button type="button" className="u-field__clear" aria-label={`${label ?? ''} 지우기`} onClick={() => onChange('')}>
            <img src={clearIcon} alt="" />
          </button>
        )}
      </div>
      {error && <p className="u-field__error">{error}</p>}
    </div>
  );
}
