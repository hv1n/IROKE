import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AppScreen, Button, Notice, ScreenTitle } from '../ui';
import { DEFAULT_RETURN, useAuth } from './AuthProvider';

/** /auth/kakao/callback — 카카오가 돌려준 인가 코드를 백엔드로 보내 로그인한다 */
export function KakaoCallback() {
  const [params] = useSearchParams();
  const { completeKakao } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    if (!code) {
      // 사용자가 동의 화면에서 취소하면 error=access_denied
      setError(params.get('error') === 'access_denied' ? '카카오 로그인을 취소했어요.' : '카카오 로그인에 실패했어요.');
      return;
    }
    completeKakao(code, params.get('state'))
      .then((returnTo) => navigate(returnTo, { replace: true }))
      .catch((err: Error) => setError(err.message || '카카오 로그인에 실패했어요.'));
  }, [params, completeKakao, navigate]);

  return (
    <AppScreen bottom={error ? <Button onClick={() => navigate(DEFAULT_RETURN, { replace: true })}>처음으로</Button> : undefined}>
      <ScreenTitle title={error ? '로그인하지 못했어요.' : '로그인하고 있어요.'} />
      <div style={{ marginTop: 24 }}>
        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : (
          <p className="flow-loading" role="status">
            <span className="u-spinner" aria-hidden="true" />
            잠시만 기다려 주세요
          </p>
        )}
      </div>
    </AppScreen>
  );
}
