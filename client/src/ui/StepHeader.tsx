import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import backWhite from './assets/back-white.svg';
import backIcon from './assets/back.svg';

interface StepHeaderProps {
  /** 1부터 센다 */
  step: number;
  total?: number;
  label: string;
  /** 없으면 브라우저 뒤로 */
  onBack?: () => void;
  /** 오른쪽 위 (개발 모드 표시, 처음부터 버튼 등) */
  end?: ReactNode;
  /** dark: 어두운 배경 위 (카드 완성 화면) */
  tone?: 'light' | 'dark';
}

/** 뒤로 · n/6 · 단계 이름 · 진행선 */
export function StepHeader({ step, total = 6, label, onBack, end, tone = 'light' }: StepHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={`step-header${tone === 'dark' ? ' step-header--dark' : ''}`}>
      <div className="step-header__top">
        <BackButton onClick={onBack ?? (() => navigate(-1))} light={tone === 'dark'} />
        {end}
      </div>
      <p className="step-header__count">
        {step}/{total}
      </p>
      <p className="step-header__label">{label}</p>
      <ol className="progress" aria-label={`${total}단계 중 ${step}단계`}>
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={i < step ? 'is-on' : undefined} />
        ))}
      </ol>
    </header>
  );
}

export function BackButton({ onClick, label = '뒤로', light }: { onClick: () => void; label?: string; light?: boolean }) {
  return (
    <button type="button" className="u-icon-button" onClick={onClick} aria-label={label}>
      <img src={light ? backWhite : backIcon} alt="" />
    </button>
  );
}
