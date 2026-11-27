import type { MouseEvent } from 'react';
import { Link } from 'react-router';
import homeOff from './assets/tab-home-off.svg';
import homeOn from './assets/tab-home-on.svg';
import myOff from './assets/tab-my-off.svg';
import myOn from './assets/tab-my-on.svg';
import requestsOff from './assets/tab-requests-off.svg';
import requestsOn from './assets/tab-requests-on.svg';

export type TabKey = 'home' | 'requests' | 'my';

const TABS: { key: TabKey; label: string; on: string; off: string }[] = [
  { key: 'home', label: '홈', on: homeOn, off: homeOff },
  { key: 'requests', label: '요청내역', on: requestsOn, off: requestsOff },
  { key: 'my', label: '마이', on: myOn, off: myOff },
];

interface TabBarProps {
  active: TabKey;
  /** 탭별 이동 경로 (손님/미용사가 다르다) */
  links: Record<TabKey, string>;
  /** 라벨 바꾸기 (디자이너: 요청보기) */
  labels?: Partial<Record<TabKey, string>>;
  /** 이동 전에 가로챌 때 (미등록 미용사가 요청내역·마이를 누르면 안내 모달). e.preventDefault()로 막는다 */
  onSelect?: (key: TabKey, e: MouseEvent<HTMLAnchorElement>) => void;
}

/** 하단 탭바 (Figma Component 24: 홈 · 요청내역 · 마이) */
export function TabBar({ active, links, labels, onSelect }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      <ul>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                to={links[t.key]}
                className="tabbar__item"
                aria-current={on ? 'page' : undefined}
                onClick={(e) => onSelect?.(t.key, e)}
              >
                <img src={on ? t.on : t.off} alt="" />
                {labels?.[t.key] ?? t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
