import type { ReactNode } from 'react';
import './ui.css';

interface AppScreenProps {
  /** 맨 위 고정 영역 (StepHeader 등) */
  header?: ReactNode;
  /** 화면 아래에 붙는 버튼 영역. BottomBar 안에 들어간다 */
  bottom?: ReactNode;
  /** 하단 탭바. 넣으면 본문 아래 여백을 탭바만큼 둔다 */
  tabBar?: ReactNode;
  tone?: 'gray' | 'white' | 'dark';
  children: ReactNode;
}

/** 모바일 390px 한 화면. 본문은 좌우 24px 여백 */
export function AppScreen({ header, bottom, tabBar, tone = 'gray', children }: AppScreenProps) {
  const cls = `app-screen${tone === 'gray' ? '' : ` app-screen--${tone}`}${tabBar ? ' app-screen--tabbar' : ''}`;
  return (
    <div className={cls}>
      {header}
      <main className="app-screen__main">{children}</main>
      {bottom && <div className="bottom-bar">{bottom}</div>}
      {tabBar}
    </div>
  );
}

export function ScreenTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="screen-title">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
