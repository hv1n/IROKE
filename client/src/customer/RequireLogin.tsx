import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../account/AuthProvider';
import { KakaoButton } from '../account/KakaoButton';
import { AppScreen, Button, ScreenTitle } from '../ui';

/** 로그인해야 쓰는 화면 (디자이너 구하기·요청내역·마이). 로그인 뒤 같은 화면으로 돌아온다 */
export function RequireLogin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (user) return children;
  const here = location.pathname + location.search;
  return (
    <AppScreen
      tone="white"
      bottom={
        <div className="login-actions">
          <KakaoButton returnTo={here} />
          <Button variant="secondary" onClick={() => navigate('/')}>
            홈으로
          </Button>
        </div>
      }
    >
      <ScreenTitle title={'로그인이 필요해요.'} sub={'디자이너 구하기·요청내역·마이는\n카카오 로그인 뒤에 쓸 수 있어요. AI 시안은 로그인 없이 만들 수 있어요.'} />
    </AppScreen>
  );
}
