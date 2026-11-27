import { Link, useNavigate } from 'react-router';
import { useAuth } from '../account/AuthProvider';
import { profileSummary, historyRowText } from '../flow/lib/labels';
import { loadSavedProfile } from '../flow/lib/storage';
import { AppScreen, Button, Card, TabBar } from '../ui';
import { BrandHeader } from './parts';
import { CUSTOMER_TABS } from './tabs';

/** 손님 마이 (Figma에 화면 없음 → 공통 컴포넌트로 구성) */
export function My() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const saved = loadSavedProfile();
  return (
    <AppScreen tabBar={<TabBar active="my" links={CUSTOMER_TABS} />} header={<BrandHeader />}>
      <section className="my-head">
        <p className="my-head__name">{user?.nickname}님</p>
        <p className="my-head__temp">매너 온도 {user?.temperature.toFixed(1)}°</p>
      </section>

      <Card className="my-card">
        <h2 className="section-title">내 모발 프로필</h2>
        {saved ? (
          <>
            <dl className="my-profile">
              {[...profileSummary(saved.profile), ['시술 이력', historyRowText(saved.profile)] as [string, string]].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="section-sub">{saved.confirmedAt.slice(0, 10).replaceAll('-', '.')}에 확정</p>
            <div className="button-row">
              <Button size="md" variant="secondary" onClick={() => navigate('/profile')}>
                확인·수정하기
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="section-sub">아직 확정한 모발 프로필이 없어요. AI 시안을 만들면서 확정할 수 있어요.</p>
            <div className="button-row">
              <Button size="md" onClick={() => navigate('/start')}>
                AI 시안 만들기 →
              </Button>
            </div>
          </>
        )}
      </Card>

      <ul className="my-menu">
        <li>
          <Link to="/requests">요청내역</Link>
        </li>
        <li>
          <Link to="/pro">디자이너로 전환</Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/', { replace: true });
            }}
          >
            로그아웃
          </button>
        </li>
      </ul>
    </AppScreen>
  );
}
