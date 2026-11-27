import { Link } from 'react-router';
import { useAuth } from '../account/AuthProvider';
import { KakaoButton } from '../account/KakaoButton';
import { CUSTOMER_TABS } from '../customer/tabs';
import { loadSavedProfile } from '../flow/lib/storage';
import { TabBar } from '../ui';
import { Header } from './Header';
import { Hero, HomeLink } from './Hero';

/**
 * 손님 홈 (Figma 459:1022 로그인 전 · 521:1625 로그인 후).
 * 로그인하지 않아도 AI 시안은 만들 수 있다. 로그인하면 탭바(요청내역·마이)가 생긴다.
 */
export function Landing() {
  const { user } = useAuth();
  const saved = loadSavedProfile();
  return (
    <div className={`page${user ? ' page--tabbar' : ''}`}>
      <Header />
      <Hero
        actions={
          <>
            {user ? (
              <HomeLink to="/start">AI 헤어시안 만들기 →</HomeLink>
            ) : (
              <>
                <KakaoButton returnTo="/" />
                <HomeLink to="/start">로그인 없이 바로 시작 →</HomeLink>
              </>
            )}
            {saved && (
              <Link className="home-text-link" to="/profile">
                저장된 모발 프로필로 시작
              </Link>
            )}
          </>
        }
      />
      {user && <TabBar active="home" links={CUSTOMER_TABS} />}
    </div>
  );
}
