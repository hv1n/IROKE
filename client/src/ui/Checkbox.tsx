import type { ReactNode } from 'react';
import checkOn from './assets/check-on.svg';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** 18px 체크박스 (Figma Component 20 on/off) */
export function Checkbox({ checked, onChange, children }: CheckboxProps) {
  return (
    <label className="u-check">
      <input type="checkbox" className="visually-hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="u-check__box" aria-hidden="true">
        {checked && <img src={checkOn} alt="" />}
      </span>
      <span className="u-check__label">{children}</span>
    </label>
  );
}
