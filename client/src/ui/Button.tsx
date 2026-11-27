import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  /** lg 57px(하단 버튼) · md 50px(카드 안) · sm 46px(모달 안) */
  size?: 'lg' | 'md' | 'sm';
}

export function Button({ variant = 'primary', size = 'lg', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`btn btn--${variant} btn--${size}${className ? ` ${className}` : ''}`} {...rest} />;
}

/** 테두리만 있는 작은 알약 버튼 (다시 업로드하기, + 추가하기) */
export function PillButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`pill-button${className ? ` ${className}` : ''}`} {...rest} />;
}
