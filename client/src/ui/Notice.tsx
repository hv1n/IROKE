import type { ReactNode } from 'react';
import errorIcon from './assets/error.svg';
import infoIcon from './assets/info-sm.svg';

/** 한 줄 안내. error: 빨간 경고(판단 어려움 등) · info: 갈색 안내 */
export function Notice({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return (
    <p className={`u-notice u-notice--${tone}`}>
      <img src={tone === 'error' ? errorIcon : infoIcon} alt="" />
      <span>{children}</span>
    </p>
  );
}
