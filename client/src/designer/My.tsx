import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../account/AuthProvider';
import { NotificationBell } from '../account/NotificationBell';
import { ArrowCircle, Avatar, GradeBadge, PlainHeader } from '../customer/parts';
import { AppScreen, Button, Notice, ScreenTitle, TabBar } from '../ui';
import instagram from '../ui/assets/instagram.svg';
import sparkle from '../ui/assets/remake-other.png';
import refresh3d from '../ui/assets/remake-same.png';
import { AlertSettingsSheet } from './AlertSettingsSheet';
import { VerifyNotice } from './VerifyNotice';
import { useDesigner } from './useDesigner';
import { DESIGNER_TABS, DESIGNER_TAB_LABELS } from './tabs';

const district = (r: string) => r.split(' ').slice(1).join(' ');

/** 디자이너 마이페이지 (Figma 547:5872) */
export function DesignerMy() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: 'verify' | 'saved' } | null)?.notice;
  const [me] = useDesigner();
  const [alerts, setAlerts] = useState(false);
  if (!me) return null;
  return (
    <AppScreen header={<PlainHeader onBack={() => navigate('/pro')} end={<NotificationBell />} />} tabBar={<TabBar active="my" links={DESIGNER_TABS} labels={DESIGNER_TAB_LABELS} />}>
      <ScreenTitle title="마이페이지" />
      {notice === 'verify' && me.verifyStatus === 'pending' && <Notice tone="info">인증을 요청했어요. 영업일 기준 1~2일 걸려요.</Notice>}
      {notice === 'saved' && <Notice tone="info">프로필을 수정했어요.</Notice>}
      {notice !== 'verify' && <VerifyNotice />}

      <section className="pro-card">
        <div className="resp-card__head">
          <Avatar size={31} />
          <span className="resp-card__nick">{user?.nickname}</span>
          <GradeBadge count={me.completedCount} temperature={me.temperature} disputes={me.recentDisputes90d} showCount={false} />
        </div>
        <p className="resp-card__shop">{me.shopName}</p>
        <p className="designer-card__shop">
          {me.shopName} · {me.regions.map(district).join(', ')} · {me.temperature.toFixed(1)}°
        </p>
        {me.instagram && (
          <p className="designer-card__insta">
            <img src={instagram} alt="인스타그램" width={15} height={15} />
            {me.instagram}
          </p>
        )}
        <Button size="md" onClick={() => navigate('/pro/profile/edit')}>
          수정하기 →
        </Button>
      </section>

      <Link className="shortcut" to="/pro/responses">
        <img className="shortcut__art" src={sparkle} alt="" width={78} height={78} />
        <span className="shortcut__text">
          <span className="shortcut__eyebrow">내가 보낸 응답</span>
          <span className="shortcut__title">내 응답 보러가기</span>
        </span>
        <ArrowCircle />
      </Link>
      <Link className="shortcut" to="/pro/portfolio">
        <img className="shortcut__art" src={refresh3d} alt="" width={62} height={62} />
        <span className="shortcut__text">
          <span className="shortcut__eyebrow">나만의 시술 이력</span>
          <span className="shortcut__title">내 포트폴리오 보기</span>
        </span>
        <ArrowCircle />
      </Link>

      <ul className="my-menu">
        <li>
          <button type="button" onClick={() => setAlerts(true)}>
            새 요청 알림 설정
          </button>
        </li>
        <li>
          <Link to="/">손님 화면으로 전환</Link>
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
      <AlertSettingsSheet open={alerts} onClose={() => setAlerts(false)} />
    </AppScreen>
  );
}
